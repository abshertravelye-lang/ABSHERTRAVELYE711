import { Router } from "express";
import { db } from "@workspace/db";
import { visaApplicationSubmissionsTable, visasTable, notificationsTable, visaCustomFieldsTable } from "@workspace/db";
import { and, desc, eq, isNull } from "drizzle-orm";
import {
  ListVisaApplicationsQueryParams,
  GetVisaApplicationParams,
  UpdateVisaApplicationParams,
  UpdateVisaApplicationBody,
} from "@workspace/api-zod";
import { requireAuth, requireRole, optionalAuth } from "../middleware/auth";
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

// Generate a unique tracking number: VISA-YYYY-XXXXXX
function generateTrackingNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `VISA-${year}-${rand}`;
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
    // Strip markdown code blocks if present
    const jsonText = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const data = JSON.parse(jsonText);

    res.json({ success: true, ...data });
  } catch (e) {
    req.log.error(e);
    res.json({ success: false, error: "Could not extract passport data. Please enter manually." });
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

    // Get visa info
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

// ── Submit application ─────────────────────────────────────────────────────
router.post("/visa-applications", optionalAuth, async (req, res) => {
  try {
    const body = req.body;
    if (!body.visaId || !body.fullName || !body.nationality || !body.passportNumber
      || !body.passportIssueDate || !body.passportExpiryDate || !body.dateOfBirth
      || !body.gender || !body.email || !body.phone) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const [visa] = await db.select().from(visasTable)
      .where(and(eq(visasTable.id, Number(body.visaId)), isNull(visasTable.deletedAt)));
    if (!visa) return res.status(404).json({ error: "Visa not found" });

    // Server-side eligibility re-check
    if (body.eligibilityPath === "gcc" && !visa.acceptsGccResidency) {
      return res.status(422).json({ error: "GCC residency path is not accepted for this visa" });
    }
    if (body.eligibilityPath === "alternative") {
      const region = body.alternativeRegion;
      const regionAccepted =
        (region === "schengen" && visa.acceptsSchengenResidency) ||
        (region === "uk" && visa.acceptsUkResidency) ||
        (region === "usa" && visa.acceptsUsVisa) ||
        (region === "canada" && visa.acceptsCanadaResidency) ||
        (region === "australia" && visa.acceptsAustraliaResidency);
      if (!regionAccepted) {
        return res.status(422).json({ error: "Selected residency/visa region is not accepted for this visa" });
      }
    }
    if (body.eligibilityPath === "direct" || !body.eligibilityPath) {
      const nationality = normalize(body.nationality);
      const blocked = visa.blockedNationalities.some((n) => normalize(n) === nationality);
      const allowedList = visa.allowedNationalities;
      const allowed = allowedList.length === 0 || allowedList.some((n) => normalize(n) === nationality);
      if (blocked || !allowed) {
        const message = req.headers["x-lang"] === "en"
          ? (visa.ineligibleMessageEn || "Sorry, you are not eligible to apply for this visa.")
          : (visa.ineligibleMessageAr || "عذراً، لا يمكنك التقديم على هذه التأشيرة وفق الشروط المحددة.");
        return res.status(422).json({ error: message });
      }
    }

    const userId = (req as any).user?.sub ?? null;

    // Generate unique tracking number
    let trackingNumber = generateTrackingNumber();
    // Retry on collision (rare)
    let attempts = 0;
    while (attempts < 5) {
      const [existing] = await db.select({ id: visaApplicationSubmissionsTable.id })
        .from(visaApplicationSubmissionsTable)
        .where(eq(visaApplicationSubmissionsTable.trackingNumber, trackingNumber));
      if (!existing) break;
      trackingNumber = generateTrackingNumber();
      attempts++;
    }

    const insertData = {
      trackingNumber,
      visaId: Number(body.visaId),
      eligibilityPath: body.eligibilityPath ?? "direct",
      gccCountry: body.gccCountry ?? null,
      alternativeRegion: body.alternativeRegion ?? null,
      fullName: body.fullName,
      fullNameEn: body.fullNameEn ?? null,
      nationality: body.nationality,
      gender: body.gender,
      dateOfBirth: body.dateOfBirth,
      countryOfResidence: body.countryOfResidence ?? null,
      email: body.email,
      phone: body.phone,
      passportNumber: body.passportNumber,
      passportIssueDate: body.passportIssueDate,
      passportExpiryDate: body.passportExpiryDate,
      passportIssuingCountry: body.passportIssuingCountry ?? null,
      passportImageUrl: body.passportImageUrl ?? null,
      personalPhotoUrl: body.personalPhotoUrl ?? null,
      residencyImageUrl: body.residencyImageUrl ?? null,
      residencyBackImageUrl: body.residencyBackImageUrl ?? null,
      alternativeVisaNumber: body.alternativeVisaNumber ?? null,
      alternativeVisaExpiry: body.alternativeVisaExpiry ?? null,
      visaImageUrl: body.visaImageUrl ?? null,
      customFieldResponses: body.customFieldResponses ?? {},
      agreedToTerms: body.agreedToTerms ?? false,
      ...(userId ? { userId } : {}),
    };

    const [row] = await db.insert(visaApplicationSubmissionsTable).values(insertData as never).returning();

    if (userId) {
      await db.insert(notificationsTable).values({
        userId,
        ...STATUS_MESSAGES.received,
        relatedEntityType: "visa_application",
        relatedEntityId: String(row.id),
      });
    }

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
