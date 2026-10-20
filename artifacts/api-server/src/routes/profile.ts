import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/userUtils";

const router = Router();

// GET /api/profile
router.get("/", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId as string;
    const user = await getOrCreateUser(clerkUserId, req);
    res.json(mapUser(user));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

// PUT /api/profile
router.put("/", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId as string;
    const user = await getOrCreateUser(clerkUserId, req);
    const { fullName, phone, whatsapp, poste, onboarded } = req.body;

    const [updated] = await db
      .update(usersTable)
      .set({
        ...(fullName                ? { fullName }                : {}),
        ...(phone    !== undefined  ? { phone }                   : {}),
        ...(whatsapp !== undefined  ? { whatsapp }                : {}),
        ...(poste    !== undefined  ? { poste }                   : {}),
        ...(onboarded !== undefined ? { onboarded: String(onboarded) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, user.id))
      .returning();

    res.json(mapUser(updated));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

function mapUser(u: typeof usersTable.$inferSelect) {
  return {
    id:        u.id,
    clerkId:   u.clerkId,
    email:     u.email,
    fullName:  u.fullName,
    phone:     u.phone     ?? null,
    whatsapp:  u.whatsapp  ?? null,
    poste:     u.poste     ?? null,
    onboarded: u.onboarded === "true",
    status:    u.status,
    createdAt: u.createdAt.toISOString(),
  };
}

export default router;
