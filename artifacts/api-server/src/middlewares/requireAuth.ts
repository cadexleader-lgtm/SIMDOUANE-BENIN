import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable, type User } from "@workspace/db";
import { eq } from "drizzle-orm";
import { fetchClerkUser, getOrCreateUser, hasVerifiedEmail } from "../lib/userUtils";
import { sendError } from "../lib/httpErrors";

// Server-side admin allowlist (the real barrier; the UI only hides links).
// ADMIN_EMAILS: comma-separated list. Defaults to the historical admin.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "hazoumeclarence@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export type AuthedRequest = Request & { clerkUserId: string; currentUser: User };

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as any).clerkUserId = userId;
  next();
}

/** requireAuth + loads (or creates) the application user as req.currentUser; account must be active. */
export async function requireUser(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    (req as AuthedRequest).clerkUserId = auth.userId;
    const user = await getOrCreateUser(auth.userId);
    // Accounts disabled or suspended by an administrator cannot use the
    // features built on requireUser (files, transitaire access, vehicle files).
    if (user.status !== "active") {
      res.status(403).json({ error: "ACCOUNT_DISABLED", message: "Ce compte est désactivé. Contactez l'administrateur." });
      return;
    }
    (req as AuthedRequest).currentUser = user;
    next();
  } catch (err) {
    sendError(req, res, err);
  }
}

/**
 * Transitaire-only features. Only an administrator approval sets the status
 * to "active"; the self-declared `poste` field is never consulted.
 */
export async function requireActiveTransitaire(req: Request, res: Response, next: NextFunction) {
  await requireUser(req, res, () => {
    const user = (req as AuthedRequest).currentUser;
    if (user.transitaireStatus !== "active") {
      res.status(403).json({ error: "TRANSITAIRE_NOT_ACTIVE", transitaireStatus: user.transitaireStatus });
      return;
    }
    next();
  });
}

/**
 * Admin check: email from our DB must be in ADMIN_EMAILS AND verified by
 * Clerk. A row not yet marked verified (e.g. data migrated from Replit) is
 * re-checked against Clerk once, then marked verified.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const [row] = await db.select().from(usersTable).where(eq(usersTable.clerkId, auth.userId)).limit(1);
    const email = row?.email ?? "";
    if (!row || !ADMIN_EMAILS.includes(email.toLowerCase())) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (!row.emailVerified) {
      const clerkUser = await fetchClerkUser(auth.userId);
      if (!hasVerifiedEmail(clerkUser, email)) {
        res.status(403).json({ error: "ADMIN_EMAIL_NOT_VERIFIED" });
        return;
      }
      await db.update(usersTable).set({ emailVerified: true, updatedAt: new Date() }).where(eq(usersTable.id, row.id));
    }

    (req as any).clerkUserId = auth.userId;
    (req as AuthedRequest).currentUser = row;
    next();
  } catch (err) {
    sendError(req, res, err);
  }
}
