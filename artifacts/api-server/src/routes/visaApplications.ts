import { Router } from "express";
import { db } from "@workspace/db";
import { visaApplicationSubmissionsTable, visasTable, notificationsTable, usersTable } from "@workspace/db";
import { and, desc, eq, isNull } from "drizzle-orm";
import {
  ListVisaApplicationsQueryParams,
  GetVisaApplicationParams,
  UpdateVisaApplicationParams,
  UpdateVisaApplicationBody,
} from "@workspace/api-zod";
import { requireAuth, requireRole, optionalAuth } from "../middleware/auth";
import { isProfileComplete } from "./auth";
import OpenAI from "openai";

const router = Router();

// ── OCR client ─────────────────────────────────────────────────────────────
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Status notification copy ───────────────────────────────────────────────
const STATUS_MESSAGES: Record<string, { titleAr: string; titleEn: string; messageAr: string; messageEn: string }> = {
  received: {
    titleAr: "تم استلام طلبك", titleEn: "Application received",
    messageAr: "لقد استلمنا طلب التأشيرة الخاص بك وسيتم مراجعته قريباً.",
    messageEn: "We've received your visa application and will review it shortly.",
  },
  under_review: {
    titleAr: "طلبك قيد المراجعة", titleEn: "Application under review",
    messageAr: "فريقنا يقوم الآن بمراجعة تفاصيل طلبك.",
    messageEn: "Our team is now reviewing the details of your application.",
  },
  awaiting_documents: {
    titleAr: "بانتظار مستندات إضافية", titleEn: "Awaiting additional documents",
    messageAr: "نحتاج إلى مستندات إضافية لاستكمال طلبك. يرجى رفعها في أقرب وقت.",
    messageEn: "We need additional documents to continue processing your application. Please upload them soon.",
  },
  documents_uploaded: {
    titleAr: "تم رفع المستندات", titleEn: "Documents uploaded",
    messageAr: "تم استلام مستنداتك وسيتم استكمال إجراءات طلبك.",
    messageEn: "Your documents have been received and processing will continue.",
  },
  sent_to_embassy: {
    titleAr: "تم إرسال الطلب للسفارة", titleEn: "Sent to embassy",
    messageAr: "تم إرسال طلبك إلى السفارة المعنية لاستكمال الإجراءات.",
    messageEn: "Your application has been forwarded to the embassy for processing.",
  },
  processing: {
    titleAr: "الطلب قيد المعالجة", titleEn: "Processing",
    messageAr: "السفارة تقوم حالياً بمعالجة طلبك.",
    messageEn: "The embassy is currently processing your application.",
  },
  issued: {
    titleAr: "تم إصدار التأشيرة", titleEn: "Visa issued",
    messageAr: "تهانينا! تم إصدار تأشيرتك بنجاح.",
    messageEn: "Congratulations! Your visa has been issued successfully.",
  },
  completed: {
    titleAr: "تم إكمال الطلب", titleEn: "Application completed",
    messageAr: "تم إكمال طلبك بنجاح. نتمنى لك رحلة سعيدة.",
    messageEn: "Your application has been completed. Have a great trip.",
  },
  rejected: {
    titleAr: "تم رفض الطلب", titleEn: "Application rejected",
    messageAr: "نأسف لإعلامك بأن طلبك لم يتم قبوله. يرجى التواصل معنا لمزيد من التفاصيل.",
    messageEn: "We're sorry to inform you that your application was not approved. Please contact us for details.",
  },
  cancelled: {
    titleAr: "تم إلغاء الطلب", titleEn: "Application cancelled",
    messageAr: "تم إلغاء طلبك.",
    messageEn: "Your application has been cancelled.",
  },
};

const toResponse = (r: typeof visaApplicationSubmissionsTable.$inferSelect) => ({
  ...r,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

const normalize = (s: string) => s.trim().toLocaleLowerCase();

/** Generate unique application number: AT-YYYY-NNNNNN */
function generateApplicationNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `AT-${year}-${rand}`;
}

/** Core eligibility engine — called by both the pre-check endpoint and submission.
 *  Priority order (as per admin spec):
 *  1. Prohibited nationality → BLOCK immediately (cannot be overridden)
 *  2. Allowed nationalities list (if non-empty) → must be in list
 *  3. GCC residency requirement → check stored profile + accepted GCC countries
 *  4. European/Schengen logic → check stored profile document type
 */
function checkEligibility(
  user: typeof usersTable.$inferSelect,
  visa: typeof visasTable.$inferSelect,
  ar: boolean,
): { eligible: boolean; reason?: string } {
  const nationality = normalize(user.nationality ?? "");
  const ineligibleAr = visa.ineligibleMessageAr || "لا يمكنك التقديم على هذه التأشيرة";
  const ineligibleEn = visa.ineligibleMessageEn || "You cannot apply for this visa.";

  // ── Step 1: Prohibited nationality ALWAYS wins ─────────────────────────────
  const blocked = visa.blockedNationalities.some((n) => normalize(n) === nationality);
  if (blocked) {
    return { eligible: false, reason: ar ? ineligibleAr : ineligibleEn };
  }

  // ── Step 2: Allowed nationalities list (empty = open to all non-blocked) ───
  const allowedList = visa.allowedNationalities ?? [];
  if (allowedList.length > 0) {
    const allowed = allowedList.some((n) => normalize(n) === nationality);
    if (!allowed) {
      return {
        eligible: false,
        reason: ar
          ? (visa.ineligibleMessageAr || "جنسيتك غير مؤهلة للتقديم على هذه التأشيرة")
          : (visa.ineligibleMessageEn || "Your nationality is not eligible for this visa."),
      };
    }
  }

  // ── Step 3: GCC residency requirement ─────────────────────────────────────
  // New field: gccResidencyRequirement ("not_required" | "required")
  // Fallback to legacy fields for backwards compatibility
  const gccReq: string = (visa as unknown as Record<string, unknown>).gccResidencyRequirement as string ??
    (visa.acceptsGccResidency && (visa.requiredResidencies ?? []).includes("gcc") ? "required" : "not_required");

  if (gccReq === "required" || gccReq === "required_for_nationalities") {
    if (!user.isGccResident || !user.gccResidenceCountry) {
      return {
        eligible: false,
        reason: ar
          ? "هذه التأشيرة تتطلب إقامة خليجية سارية. يرجى إضافة بيانات إقامتك الخليجية في ملفك الشخصي."
          : "This visa requires a valid GCC residence. Please add your GCC residency details to your profile.",
      };
    }
    // Check that user's GCC country is in the accepted list (if specified)
    const acceptedGcc: string[] = ((visa as unknown as Record<string, unknown>).acceptedGccCountries as string[]) ?? [];
    if (acceptedGcc.length > 0) {
      const userCountry = normalize(user.gccResidenceCountry ?? "");
      const accepted = acceptedGcc.some((c) => {
        const nc = normalize(c);
        return nc === userCountry || nc.includes(userCountry) || userCountry.includes(nc);
      });
      if (!accepted) {
        const list = acceptedGcc.join(ar ? "، " : ", ");
        return {
          eligible: false,
          reason: ar
            ? `إقامتك الخليجية غير مقبولة لهذه التأشيرة. الدول المقبولة: ${list}`
            : `Your GCC residence country is not accepted for this visa. Accepted: ${list}`,
        };
      }
    }
  }

  // ── Step 4: European / Schengen logic ──────────────────────────────────────
  // europeanSchengenLogic: "neither" | "european_only" | "schengen_only" | "either" | "both"
  const euLogic: string = ((visa as unknown as Record<string, unknown>).europeanSchengenLogic as string) ?? "neither";

  if (euLogic !== "neither") {
    const docType = (user.europeanDocumentType ?? "").toLowerCase();
    const hasDoc = !!(user as unknown as Record<string, unknown>).europeanDocumentUrl;
    const isEuResident = !!(user as unknown as Record<string, unknown>).isEuropeanResident;

    const isEuResidencyType = hasDoc && isEuResident &&
      (docType === "eu_residency" || docType === "uk_residency");
    const isSchengenType = hasDoc && isEuResident &&
      (docType === "schengen_visa" || docType === "uk_visa");
    const hasAnyEuDoc = hasDoc && isEuResident;

    if (euLogic === "european_only" && !isEuResidencyType) {
      return {
        eligible: false,
        reason: ar
          ? "هذه التأشيرة تتطلب إقامة أوروبية سارية (UK Residency أو EU Residency) في ملفك الشخصي."
          : "This visa requires a valid European residency (EU or UK) in your profile.",
      };
    }
    if (euLogic === "schengen_only" && !isSchengenType) {
      return {
        eligible: false,
        reason: ar
          ? "هذه التأشيرة تتطلب تأشيرة شنغن أو بريطانية سارية في ملفك الشخصي."
          : "This visa requires a valid Schengen or UK visa in your profile.",
      };
    }
    if (euLogic === "either" && !hasAnyEuDoc) {
      return {
        eligible: false,
        reason: ar
          ? "هذه التأشيرة تتطلب إقامة أوروبية أو تأشيرة شنغن سارية في ملفك الشخصي."
          : "This visa requires a valid European residency or Schengen visa in your profile.",
      };
    }
    if (euLogic === "both" && !(isEuResidencyType && isSchengenType)) {
      return {
        eligible: false,
        reason: ar
          ? "هذه التأشيرة تتطلب إقامة أوروبية وتأشيرة شنغن معاً في ملفك الشخصي."
          : "This visa requires both a European residency and a Schengen visa in your profile.",
      };
    }
  }

  return { eligible: true };
}

// ── OCR endpoint ──────────────────────────────────────────────────────────
router.post("/visa-applications/ocr", async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: "imageUrl is required" });

    const prompt = `You are a passport OCR system. Extract the following fields from the passport image and return ONLY a JSON object with these exact keys:
- fullName (name in Arabic/native script if available)
- fullNameEn (name in English / Latin script)
- passportNumber
- nationality (country name in English)
- gender (male/female)
- dateOfBirth (YYYY-MM-DD format)
- issueDate (YYYY-MM-DD format)
- expiryDate (YYYY-MM-DD format)
- issuingCountry (country name in English)

If a field cannot be read or is not visible, use null. Return only valid JSON, no markdown.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
          ],
        },
      ],
      max_tokens: 500,
    });

    const text = response.choices[0]?.message?.content ?? "{}";
    const jsonText = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const data = JSON.parse(jsonText);

    res.json({ success: true, ...data });
  } catch (e) {
    req.log.error(e);
    res.json({ success: false, error: "Could not extract passport data. Please enter manually." });
  }
});

// ── Photo validation endpoint ──────────────────────────────────────────────
router.post("/visa-applications/validate-photo", async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: "imageUrl is required" });

    const prompt = `Analyze this image for use as a passport/ID photo. Return ONLY a JSON object with:
- valid: true or false
- reason: short explanation (in English) if invalid, or "Photo accepted" if valid
- faceDetected: true or false
- singleFace: true or false (true if exactly one face)

Check: exactly one face, face clearly visible, reasonable lighting, no excessive blur, appropriate framing. Return only valid JSON, no markdown.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl, detail: "low" } },
          ],
        },
      ],
      max_tokens: 200,
    });

    const text = response.choices[0]?.message?.content ?? "{}";
    const jsonText = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const data = JSON.parse(jsonText);
    res.json(data);
  } catch (e) {
    req.log.error(e);
    res.json({ valid: true, reason: "Photo accepted", faceDetected: true, singleFace: true });
  }
});

// ── Pre-check eligibility (authenticated) ─────────────────────────────────
router.get("/visa-applications/eligibility/:visaId", requireAuth, async (req, res) => {
  try {
    const visaId = Number(req.params.visaId);
    const ar = req.headers["x-lang"] === "ar";

    const [user] = await db.select().from(usersTable)
      .where(and(eq(usersTable.id, req.user!.sub), isNull(usersTable.deletedAt)));
    if (!user) return res.status(404).json({ error: "User not found" });

    // Profile must be complete before applying
    if (!isProfileComplete(user)) {
      return res.json({
        eligible: false,
        reason: ar
          ? "يجب إكمال ملفك الشخصي قبل التقديم على أي تأشيرة."
          : "You must complete your profile before applying for a visa.",
        profileIncomplete: true,
      });
    }

    const [visa] = await db.select().from(visasTable)
      .where(and(eq(visasTable.id, visaId), isNull(visasTable.deletedAt)));
    if (!visa) return res.status(404).json({ error: "Visa not found" });
    if (!visa.isActive || visa.status !== "available") {
      return res.json({ eligible: false, reason: ar ? "هذه التأشيرة غير متاحة حالياً." : "This visa is not currently available." });
    }

    const result = checkEligibility(user, visa, ar);
    res.json(result);
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Tracking endpoint (public) ─────────────────────────────────────────────
router.get("/visa-applications/track/:trackingNumber", async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const [row] = await db
      .select({
        id: visaApplicationSubmissionsTable.id,
        trackingNumber: visaApplicationSubmissionsTable.trackingNumber,
        status: visaApplicationSubmissionsTable.status,
        fullName: visaApplicationSubmissionsTable.fullName,
        adminNotes: visaApplicationSubmissionsTable.adminNotes,
        createdAt: visaApplicationSubmissionsTable.createdAt,
        updatedAt: visaApplicationSubmissionsTable.updatedAt,
        visaId: visaApplicationSubmissionsTable.visaId,
      })
      .from(visaApplicationSubmissionsTable)
      .where(eq(visaApplicationSubmissionsTable.trackingNumber, trackingNumber));

    if (!row) return res.status(404).json({ error: "Tracking number not found" });

    const [visa] = await db.select({
      visaType: visasTable.visaType,
      countryAr: visasTable.countryAr,
      countryEn: visasTable.countryEn,
    }).from(visasTable).where(eq(visasTable.id, row.visaId));

    res.json({
      id: row.id,
      trackingNumber: row.trackingNumber,
      status: row.status,
      fullName: row.fullName,
      adminNotes: row.adminNotes,
      visaType: visa?.visaType ?? "",
      countryAr: visa?.countryAr ?? "",
      countryEn: visa?.countryEn ?? "",
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── List applications ──────────────────────────────────────────────────────
router.get("/visa-applications", requireAuth, async (req, res) => {
  try {
    const query = ListVisaApplicationsQueryParams.parse(req.query);
    const conditions = [];
    if (query.visaId) conditions.push(eq(visaApplicationSubmissionsTable.visaId, query.visaId));
    if (query.status) conditions.push(eq(visaApplicationSubmissionsTable.status, query.status as any));
    const isStaff = ["agent", "admin", "super_admin"].includes(req.user!.role);
    if (!isStaff) conditions.push(eq(visaApplicationSubmissionsTable.userId, req.user!.sub));
    const rows = await db
      .select()
      .from(visaApplicationSubmissionsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(visaApplicationSubmissionsTable.createdAt));
    res.json(rows.map(toResponse));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Submit application (requires auth + complete profile) ──────────────────
router.post("/visa-applications", requireAuth, async (req, res) => {
  try {
    const ar = req.headers["x-lang"] === "ar";
    const userId = req.user!.sub;

    // Load user's stored profile
    const [user] = await db.select().from(usersTable)
      .where(and(eq(usersTable.id, userId), isNull(usersTable.deletedAt)));
    if (!user) return res.status(401).json({ error: "User not found" });

    // Enforce profile completion
    if (!isProfileComplete(user)) {
      return res.status(422).json({
        error: ar
          ? "يجب إكمال ملفك الشخصي قبل التقديم على أي تأشيرة."
          : "Your profile must be complete before submitting a visa application.",
        profileIncomplete: true,
      });
    }

    const body = req.body;
    if (!body.visaId) return res.status(400).json({ error: "visaId is required" });

    const [visa] = await db.select().from(visasTable)
      .where(and(eq(visasTable.id, Number(body.visaId)), isNull(visasTable.deletedAt)));
    if (!visa) return res.status(404).json({ error: "Visa not found" });
    if (!visa.isActive || visa.status !== "available") {
      return res.status(422).json({ error: ar ? "هذه التأشيرة غير متاحة حالياً." : "This visa is not currently available." });
    }

    // Server-side eligibility check using STORED profile (cannot be bypassed)
    const eligibility = checkEligibility(user, visa, ar);
    if (!eligibility.eligible) {
      return res.status(422).json({ error: eligibility.reason });
    }

    // Determine eligibility path from stored profile
    let eligibilityPath = "direct";
    if (user.isGccResident && visa.acceptsGccResidency) eligibilityPath = "gcc";
    else if (user.isEuropeanResident && (visa.acceptsSchengenResidency || visa.acceptsUkResidency)) eligibilityPath = "alternative";

    // Generate unique application number
    let trackingNumber = generateApplicationNumber();
    let attempts = 0;
    while (attempts < 5) {
      const [existing] = await db.select({ id: visaApplicationSubmissionsTable.id })
        .from(visaApplicationSubmissionsTable)
        .where(eq(visaApplicationSubmissionsTable.trackingNumber, trackingNumber));
      if (!existing) break;
      trackingNumber = generateApplicationNumber();
      attempts++;
    }

    // Build application record from stored profile — no re-entry needed
    const insertData = {
      trackingNumber,
      visaId: Number(body.visaId),
      userId,
      eligibilityPath,
      gccCountry: user.isGccResident ? (user.gccResidenceCountry ?? null) : null,
      alternativeRegion: user.isEuropeanResident ? (user.europeanDocumentType ?? null) : null,
      // Personal info from stored profile
      fullName: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
      fullNameEn: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
      nationality: user.nationality ?? "",
      gender: (user.gender as any) ?? "male",
      dateOfBirth: user.dateOfBirth ?? "",
      countryOfResidence: user.isGccResident ? (user.gccResidenceCountry ?? null) : null,
      email: user.email ?? "",
      phone: user.phone ?? "",
      // Passport from stored profile
      passportNumber: user.passportNumber ?? "",
      passportIssueDate: user.passportIssueDate ?? null,
      passportExpiryDate: user.passportExpiryDate ?? "",
      passportIssuingCountry: user.passportIssueCountry ?? null,
      passportImageUrl: user.passportImageUrl ?? null,
      personalPhotoUrl: user.profilePhotoUrl ?? null,
      // Residency docs from stored profile
      residencyImageUrl: user.gccResidenceFrontUrl ?? null,
      residencyBackImageUrl: user.gccResidenceBackUrl ?? null,
      alternativeVisaNumber: null,
      alternativeVisaExpiry: null,
      visaImageUrl: user.europeanDocumentUrl ?? null,
      // Visa-specific extras from request body
      customFieldResponses: body.customFieldResponses ?? {},
      agreedToTerms: body.agreedToTerms ?? false,
    };

    const [row] = await db.insert(visaApplicationSubmissionsTable).values(insertData as never).returning();

    // Send notification
    await db.insert(notificationsTable).values({
      userId,
      ...STATUS_MESSAGES.received,
      relatedEntityType: "visa_application",
      relatedEntityId: String(row.id),
    });

    res.status(201).json(toResponse(row));
  } catch (e: unknown) {
    req.log.error(e);
    if (e && typeof e === "object" && "name" in e && (e as { name: string }).name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: e });
    }
    res.status(500).json({ error: "An error occurred while processing your application. Please try again." });
  }
});

// ── Get application ────────────────────────────────────────────────────────
router.get("/visa-applications/:id", requireAuth, async (req, res) => {
  try {
    const { id } = GetVisaApplicationParams.parse({ id: Number(req.params.id) });
    const [row] = await db.select().from(visaApplicationSubmissionsTable).where(eq(visaApplicationSubmissionsTable.id, id));
    if (!row) return res.status(404).json({ error: "Not found" });
    const isStaff = ["agent", "admin", "super_admin"].includes(req.user!.role);
    if (!isStaff && row.userId !== req.user!.sub) return res.status(403).json({ error: "Forbidden" });
    res.json(toResponse(row));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Update application status (staff only) ─────────────────────────────────
router.patch("/visa-applications/:id", requireAuth, requireRole("agent", "admin", "super_admin"), async (req, res) => {
  try {
    const { id } = UpdateVisaApplicationParams.parse({ id: Number(req.params.id) });
    const body = UpdateVisaApplicationBody.parse(req.body);
    const [row] = await db
      .update(visaApplicationSubmissionsTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(visaApplicationSubmissionsTable.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });

    if (body.status && row.userId) {
      const copy = STATUS_MESSAGES[body.status];
      if (copy) {
        await db.insert(notificationsTable).values({
          userId: row.userId,
          ...copy,
          relatedEntityType: "visa_application",
          relatedEntityId: String(row.id),
        });
      }
    }

    res.json(toResponse(row));
  } catch (e) {
    req.log.error(e);
    res.status(400).json({ error: "Invalid input" });
  }
});

export default router;
