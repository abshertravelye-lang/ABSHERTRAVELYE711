import { Router } from "express";
import crypto from "node:crypto";
import { db } from "@workspace/db";
import {
  supportConversationsTable,
  supportMessagesTable,
  usersTable,
} from "@workspace/db";
import { and, asc, desc, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, requirePermission } from "../middleware/auth";
import { notifyUser } from "../lib/notify";

const router = Router();

// Support chat is customer-support functionality, so it is gated behind the
// existing "messages" staff permission (the support_employee role preset
// already grants it). Chosen over 'customers'/'settings' as the closest fit.
const SUPPORT_PERMISSION = "messages" as const;

const MAX_BODY_LEN = 2000;
const GUEST_RATE_WINDOW_MS = 60_000;
const GUEST_RATE_MAX = 20; // messages per conversation per minute

// Simple in-memory rate limiter for guest message posts.
const guestRateBuckets = new Map<string, number[]>();
function guestRateLimited(conversationId: string): boolean {
  const now = Date.now();
  const times = (guestRateBuckets.get(conversationId) ?? []).filter(
    (t) => now - t < GUEST_RATE_WINDOW_MS,
  );
  if (times.length >= GUEST_RATE_MAX) {
    guestRateBuckets.set(conversationId, times);
    return true;
  }
  times.push(now);
  guestRateBuckets.set(conversationId, times);
  return false;
}

const bodySchema = z.object({
  body: z.string().trim().min(1).max(MAX_BODY_LEN),
});

type ConversationRow = typeof supportConversationsTable.$inferSelect;
type MessageRow = typeof supportMessagesTable.$inferSelect;

const formatConversation = (c: ConversationRow) => ({
  id: c.id,
  userId: c.userId,
  guestName: c.guestName,
  status: c.status,
  lastMessageAt: c.lastMessageAt ? c.lastMessageAt.toISOString() : null,
  customerUnreadCount: c.customerUnreadCount,
  staffUnreadCount: c.staffUnreadCount,
  createdAt: c.createdAt.toISOString(),
  updatedAt: c.updatedAt.toISOString(),
});

const formatMessage = (m: MessageRow) => ({
  id: m.id,
  conversationId: m.conversationId,
  sender: m.sender,
  senderUserId: m.senderUserId,
  body: m.body,
  createdAt: m.createdAt.toISOString(),
});

// Resolve the `after` filter (ISO timestamp or message id) to a created_at cutoff.
async function resolveAfter(conversationId: string, after?: string): Promise<Date | null> {
  if (!after) return null;
  const asDate = new Date(after);
  if (!Number.isNaN(asDate.getTime())) return asDate;
  // Treat as a message id.
  const [msg] = await db
    .select({ createdAt: supportMessagesTable.createdAt })
    .from(supportMessagesTable)
    .where(
      and(eq(supportMessagesTable.id, after), eq(supportMessagesTable.conversationId, conversationId)),
    );
  return msg ? msg.createdAt : null;
}

async function loadMessages(conversationId: string, after?: string) {
  const cutoff = await resolveAfter(conversationId, after);
  const conditions = [eq(supportMessagesTable.conversationId, conversationId)];
  if (cutoff) conditions.push(gt(supportMessagesTable.createdAt, cutoff));
  return db
    .select()
    .from(supportMessagesTable)
    .where(and(...conditions))
    .orderBy(asc(supportMessagesTable.createdAt));
}

// ── Customer (authenticated) ────────────────────────────────────────────────

// Get-or-create the caller's single open conversation.
router.post("/support/conversation", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.sub;
    const [existing] = await db
      .select()
      .from(supportConversationsTable)
      .where(
        and(
          eq(supportConversationsTable.userId, userId),
          eq(supportConversationsTable.status, "open"),
        ),
      )
      .orderBy(desc(supportConversationsTable.lastMessageAt))
      .limit(1);
    if (existing) return res.json(formatConversation(existing));

    const [created] = await db
      .insert(supportConversationsTable)
      .values({ userId, status: "open" })
      .returning();
    res.status(201).json(formatConversation(created));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/support/messages", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.sub;
    const after = typeof req.query.after === "string" ? req.query.after : undefined;
    const [conv] = await db
      .select()
      .from(supportConversationsTable)
      .where(
        and(
          eq(supportConversationsTable.userId, userId),
          eq(supportConversationsTable.status, "open"),
        ),
      )
      .orderBy(desc(supportConversationsTable.lastMessageAt))
      .limit(1);
    if (!conv) return res.json([]);

    const rows = await loadMessages(conv.id, after);
    if (conv.customerUnreadCount > 0) {
      await db
        .update(supportConversationsTable)
        .set({ customerUnreadCount: 0, updatedAt: new Date() })
        .where(eq(supportConversationsTable.id, conv.id));
    }
    res.json(rows.map(formatMessage));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/support/messages", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.sub;
    const { body } = bodySchema.parse(req.body);

    let [conv] = await db
      .select()
      .from(supportConversationsTable)
      .where(
        and(
          eq(supportConversationsTable.userId, userId),
          eq(supportConversationsTable.status, "open"),
        ),
      )
      .orderBy(desc(supportConversationsTable.lastMessageAt))
      .limit(1);
    if (!conv) {
      [conv] = await db
        .insert(supportConversationsTable)
        .values({ userId, status: "open" })
        .returning();
    }

    const [msg] = await db
      .insert(supportMessagesTable)
      .values({ conversationId: conv.id, sender: "customer", senderUserId: userId, body })
      .returning();

    await db
      .update(supportConversationsTable)
      .set({
        lastMessageAt: msg.createdAt,
        staffUnreadCount: conv.staffUnreadCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(supportConversationsTable.id, conv.id));

    res.status(201).json(formatMessage(msg));
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: e.issues });
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Guest (unauthenticated) ───────────────────────────────────────────────

const guestNameSchema = z.object({ name: z.string().trim().min(1).max(120) });

router.post("/support/guest/conversation", async (req, res) => {
  try {
    const { name } = guestNameSchema.parse(req.body);
    const guestToken = crypto.randomBytes(24).toString("hex"); // 48 chars
    const [created] = await db
      .insert(supportConversationsTable)
      .values({ guestName: name, guestToken, status: "open" })
      .returning();
    res.status(201).json({ conversationId: created.id, guestToken });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: e.issues });
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

async function findGuestConversation(token: string | undefined) {
  if (!token) return null;
  const [conv] = await db
    .select()
    .from(supportConversationsTable)
    .where(eq(supportConversationsTable.guestToken, token))
    .limit(1);
  return conv ?? null;
}

router.get("/support/guest/messages", async (req, res) => {
  try {
    const token = typeof req.query.token === "string" ? req.query.token : undefined;
    const after = typeof req.query.after === "string" ? req.query.after : undefined;
    const conv = await findGuestConversation(token);
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    const rows = await loadMessages(conv.id, after);
    if (conv.customerUnreadCount > 0) {
      await db
        .update(supportConversationsTable)
        .set({ customerUnreadCount: 0, updatedAt: new Date() })
        .where(eq(supportConversationsTable.id, conv.id));
    }
    res.json(rows.map(formatMessage));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

const guestPostSchema = z.object({
  token: z.string().min(1),
  body: z.string().trim().min(1).max(MAX_BODY_LEN),
});

router.post("/support/guest/messages", async (req, res) => {
  try {
    const { token, body } = guestPostSchema.parse(req.body);
    const conv = await findGuestConversation(token);
    if (!conv) return res.status(404).json({ error: "Conversation not found" });
    if (guestRateLimited(conv.id)) {
      return res.status(429).json({ error: "Too many messages, please slow down" });
    }

    const [msg] = await db
      .insert(supportMessagesTable)
      .values({
        conversationId: conv.id,
        sender: "customer",
        senderUserId: conv.userId ?? null,
        body,
      })
      .returning();

    await db
      .update(supportConversationsTable)
      .set({
        lastMessageAt: msg.createdAt,
        staffUnreadCount: conv.staffUnreadCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(supportConversationsTable.id, conv.id));

    res.status(201).json(formatMessage(msg));
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: e.issues });
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Link a guest conversation to the calling account (preserves history).
const claimSchema = z.object({ token: z.string().min(1) });
router.post("/support/guest/claim", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.sub;
    const { token } = claimSchema.parse(req.body);
    const conv = await findGuestConversation(token);
    if (!conv) return res.status(404).json({ error: "Conversation not found" });
    if (conv.userId && conv.userId !== userId) {
      return res.status(409).json({ error: "Conversation already linked to another account" });
    }
    if (conv.userId === userId) return res.json(formatConversation(conv));

    const [updated] = await db
      .update(supportConversationsTable)
      .set({ userId, updatedAt: new Date() })
      .where(eq(supportConversationsTable.id, conv.id))
      .returning();
    res.json(formatConversation(updated));
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: e.issues });
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Staff / admin dashboard ──────────────────────────────────────────────

router.get(
  "/support/admin/conversations",
  requireAuth,
  requirePermission(SUPPORT_PERMISSION),
  async (req, res) => {
    try {
      const rows = await db
        .select({
          conversation: supportConversationsTable,
          userEmail: usersTable.email,
          userPhone: usersTable.phone,
          userFirstName: usersTable.firstName,
          userLastName: usersTable.lastName,
        })
        .from(supportConversationsTable)
        .leftJoin(usersTable, eq(supportConversationsTable.userId, usersTable.id))
        .orderBy(desc(supportConversationsTable.lastMessageAt), desc(supportConversationsTable.createdAt));

      const convIds = rows.map((r) => r.conversation.id);
      // Last message preview per conversation.
      const previews = new Map<string, { body: string; createdAt: string }>();
      if (convIds.length > 0) {
        const msgs = await db
          .select()
          .from(supportMessagesTable)
          .orderBy(desc(supportMessagesTable.createdAt));
        for (const m of msgs) {
          if (!previews.has(m.conversationId)) {
            previews.set(m.conversationId, {
              body: m.body,
              createdAt: m.createdAt.toISOString(),
            });
          }
        }
      }

      const result = rows.map((r) => {
        const c = r.conversation;
        const fullName = [r.userFirstName, r.userLastName].filter(Boolean).join(" ").trim();
        const customerName = c.userId ? fullName || r.userEmail || "Customer" : c.guestName || "Guest";
        const preview = previews.get(c.id) ?? null;
        return {
          ...formatConversation(c),
          customerName,
          userEmail: r.userEmail ?? null,
          userPhone: r.userPhone ?? null,
          isGuest: !c.userId,
          lastMessagePreview: preview ? preview.body.slice(0, 140) : null,
          lastMessageSenderAt: preview ? preview.createdAt : null,
        };
      });
      res.json(result);
    } catch (e) {
      req.log.error(e);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.get(
  "/support/admin/conversations/:id/messages",
  requireAuth,
  requirePermission(SUPPORT_PERMISSION),
  async (req, res) => {
    try {
      const id = String(req.params.id);
      const [conv] = await db
        .select()
        .from(supportConversationsTable)
        .where(eq(supportConversationsTable.id, id));
      if (!conv) return res.status(404).json({ error: "Conversation not found" });

      const rows = await loadMessages(conv.id);
      if (conv.staffUnreadCount > 0) {
        await db
          .update(supportConversationsTable)
          .set({ staffUnreadCount: 0, updatedAt: new Date() })
          .where(eq(supportConversationsTable.id, conv.id));
      }
      res.json(rows.map(formatMessage));
    } catch (e) {
      req.log.error(e);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.post(
  "/support/admin/conversations/:id/reply",
  requireAuth,
  requirePermission(SUPPORT_PERMISSION),
  async (req, res) => {
    try {
      const id = String(req.params.id);
      const { body } = bodySchema.parse(req.body);
      const [conv] = await db
        .select()
        .from(supportConversationsTable)
        .where(eq(supportConversationsTable.id, id));
      if (!conv) return res.status(404).json({ error: "Conversation not found" });

      const [msg] = await db
        .insert(supportMessagesTable)
        .values({
          conversationId: conv.id,
          sender: "staff",
          senderUserId: req.user!.sub,
          body,
        })
        .returning();

      await db
        .update(supportConversationsTable)
        .set({
          lastMessageAt: msg.createdAt,
          customerUnreadCount: conv.customerUnreadCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(supportConversationsTable.id, conv.id));

      // Deliver in-app + real push to the linked customer (spec section 5).
      if (conv.userId) {
        const preview = body.slice(0, 140);
        void notifyUser({
          userId: conv.userId,
          titleAr: "رسالة جديدة من فريق الدعم",
          titleEn: "New message from our Support Team",
          messageAr: preview,
          messageEn: preview,
          relatedEntityType: "support_conversation",
          relatedEntityId: conv.id,
          url: "/support-chat",
        });
      }

      res.status(201).json(formatMessage(msg));
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: e.issues });
      req.log.error(e);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

const statusSchema = z.object({ status: z.enum(["open", "closed"]) });
router.patch(
  "/support/admin/conversations/:id",
  requireAuth,
  requirePermission(SUPPORT_PERMISSION),
  async (req, res) => {
    try {
      const id = String(req.params.id);
      const { status } = statusSchema.parse(req.body);
      const [updated] = await db
        .update(supportConversationsTable)
        .set({ status, updatedAt: new Date() })
        .where(eq(supportConversationsTable.id, id))
        .returning();
      if (!updated) return res.status(404).json({ error: "Conversation not found" });
      res.json(formatConversation(updated));
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: e.issues });
      req.log.error(e);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
