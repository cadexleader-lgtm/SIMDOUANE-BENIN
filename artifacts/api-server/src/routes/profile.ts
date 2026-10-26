import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateProfileBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/userUtils";
import { HttpError, sendError } from "../lib/httpErrors";
import { findOwnedOrganization, mapOrganization, upsertOwnedOrganization } from "../lib/organizations";

const router = Router();

// GET /api/profile
router.get("/", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId as string;
    const user = await getOrCreateUser(clerkUserId, req);
    res.json(mapUser(user, await findOwnedOrganization(user.id)));
  } catch (err) {
    sendError(req, res, err);
  }
});

// PUT /api/profile
// Only the fields below can be changed here. Permissions (transitaire status,
// admin) are never read from this payload, and `poste` stays declarative.
router.put("/", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId as string;
    const user = await getOrCreateUser(clerkUserId, req);
    const parsed = UpdateProfileBody.safeParse(req.body ?? {});
    if (!parsed.success) throw new HttpError(400, "INVALID_INPUT", "Données de profil invalides.");
    const { fullName, phone, whatsapp, poste, onboarded, accountKind } = parsed.data;

    const legalName = parsed.data.legalName?.trim() ?? "";
    // No official IFU format is enforced: optional, letters/digits only.
    const ifu = parsed.data.ifu?.replace(/\s+/g, "") || null;
    if (accountKind === "entreprise" && (legalName.length < 2 || legalName.length > 200)) {
      throw new HttpError(400, "LEGAL_NAME_REQUIRED", "La raison sociale est obligatoire pour un compte entreprise.");
    }
    if (ifu && !/^[0-9A-Za-z]{1,30}$/.test(ifu)) {
      throw new HttpError(400, "INVALID_IFU", "L'IFU ne doit contenir que des chiffres ou des lettres.");
    }

    const { updated, organization } = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(usersTable)
        .set({
          ...(fullName                ? { fullName }                : {}),
          ...(phone    !== undefined  ? { phone }                   : {}),
          ...(whatsapp !== undefined  ? { whatsapp }                : {}),
          ...(poste    !== undefined  ? { poste }                   : {}),
          ...(onboarded !== undefined ? { onboarded: String(onboarded) } : {}),
          ...(accountKind !== undefined ? { accountKind }           : {}),
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, user.id))
        .returning();
      // Switching back to "particulier" keeps the company record (retention).
      const org =
        accountKind === "entreprise"
          ? await upsertOwnedOrganization(user.id, { legalName, ifu }, tx)
          : await findOwnedOrganization(user.id, tx);
      return { updated: row, organization: org };
    });

    res.json(mapUser(updated, organization));
  } catch (err) {
    sendError(req, res, err);
  }
});

function mapUser(u: typeof usersTable.$inferSelect, organization: Awaited<ReturnType<typeof findOwnedOrganization>>) {
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
    accountKind: u.accountKind,
    organization: mapOrganization(organization),
    transitaireStatus: u.transitaireStatus,
  };
}

export default router;
