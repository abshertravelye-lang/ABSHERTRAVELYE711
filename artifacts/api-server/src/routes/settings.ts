import { Router } from "express";
import { db, appSettingsTable } from "@workspace/db";
import { inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, requirePermission } from "../middleware/auth";
import { logAudit } from "../lib/audit";

const router = Router();

/** Keys exposed publicly (used by the web platform for "Download the App"). */
const PUBLIC_KEYS = [
  "android_app_url",
  "ios_app_url",
  "app_landing_url",
  "support_url",
] as const;

const updateSchema = z.object({
  android_app_url: z.string().url().or(z.literal("")).optional(),
  ios_app_url: z.string().url().or(z.literal("")).optional(),
  app_landing_url: z.string().url().or(z.literal("")).optional(),
  support_url: z.string().url().or(z.literal("")).optional(),
});

// GET /api/settings/public — no auth; only whitelisted keys
router.get("/settings/public", async (req, res) => {
  try {
    const rows = await db.select().from(appSettingsTable)
      .where(inArray(appSettingsTable.key, [...PUBLIC_KEYS]));
    const out: Record<string, string> = {};
    for (const k of PUBLIC_KEYS) out[k] = "";
    for (const r of rows) out[r.key] = r.value;
    res.json(out);
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/settings/app-links — staff with settings permission
router.get("/settings/app-links", requireAuth, requirePermission("settings"), async (req, res) => {
  try {
    const rows = await db.select().from(appSettingsTable)
      .where(inArray(appSettingsTable.key, [...PUBLIC_KEYS]));
    const out: Record<string, string> = {};
    for (const k of PUBLIC_KEYS) out[k] = "";
    for (const r of rows) out[r.key] = r.value;
    res.json(out);
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/settings/app-links
router.put("/settings/app-links", requireAuth, requirePermission("settings"), async (req, res) => {
  try {
    const body = updateSchema.parse(req.body);
    for (const [key, value] of Object.entries(body)) {
      if (value === undefined) continue;
      await db.insert(appSettingsTable)
        .values({ key, value, updatedBy: req.user!.sub })
        .onConflictDoUpdate({
          target: appSettingsTable.key,
          set: { value, updatedBy: req.user!.sub, updatedAt: sql`now()` },
        });
    }
    logAudit(req, "settings.app_links_updated", { entityType: "app_settings", newValue: body });
    const rows = await db.select().from(appSettingsTable)
      .where(inArray(appSettingsTable.key, [...PUBLIC_KEYS]));
    const out: Record<string, string> = {};
    for (const k of PUBLIC_KEYS) out[k] = "";
    for (const r of rows) out[r.key] = r.value;
    res.json(out);
  } catch (e) {
    req.log.error(e);
    if (e instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: e.issues });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
