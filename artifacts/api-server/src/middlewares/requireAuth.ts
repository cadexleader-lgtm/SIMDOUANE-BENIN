import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable, type User } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getOrCreateUser } from "../lib/userUtils";
import { bearerToken, fetchAuthAccount, verifyAccessToken } from "../lib/auth/identity";
import { sendError } from "../lib/httpErrors";

// Server-side admin allowlist (the real barrier; the UI only hides links).
// ADMIN_EMAILS: comma-separated list. Defaults to the historical admin.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "hazoumeclarence@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export type AuthedRequest = Request & { authUserId: string; currentUser: User };

const unauthorized = (res: Response) => res.status(401).json({ error: "Unauthorized" });

/** Verified Supabase Auth user id of the caller, or null (no or invalid token). */
async function callerAuthUserId(req: Request): Promise<string | null> {
  const token = bearerToken(req);
  return token ? verifyAccessToken(token) : null;
}

/** Signed in with a valid access token; sets req.authUserId. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authUserId = await callerAuthUserId(req);
    if (!authUserId) {
      unauthorized(res);
      return;
    }
    (req as AuthedRequest).authUserId = authUserId;
    next();
  } catch (err) {
    sendError(req, res, err);
  }
}

/** requireAuth + loads (or creates) the application user as req.currentUser; account must be active. */
export async function requireUser(req: Request, res: Response, next: NextFunction) {
  try {
    const authUserId = await callerAuthUserId(req);
    if (!authUserId) {
      unauthorized(res);
      return;
    }
    (req as AuthedRequest).authUserId = authUserId;
    const user = await getOrCreateUser(authUserId);
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
 * Admin check, on every admin request: the email of our account must be in
 * ADMIN_EMAILS, and the Supabase Auth account must still exist, carry that
 * same email and have it confirmed.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const authUserId = await callerAuthUserId(req);
    if (!authUserId) {
      unauthorized(res);
      return;
    }
    const [row] = await db.select().from(usersTable).where(eq(usersTable.authUserId, authUserId)).limit(1);
    const email = row?.email ?? "";
    if (!row || !ADMIN_EMAILS.includes(email.toLowerCase())) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const account = await fetchAuthAccount(authUserId);
    if (!account || account.email?.toLowerCase() !== email.toLowerCase() || !account.emailConfirmed) {
      res.status(403).json({ error: "ADMIN_EMAIL_NOT_VERIFIED" });
      return;
    }
    if (!row.emailVerified) {
      await db.update(usersTable).set({ emailVerified: true, updatedAt: new Date() }).where(eq(usersTable.id, row.id));
    }

    (req as AuthedRequest).authUserId = authUserId;
    (req as AuthedRequest).currentUser = row;
    next();
  } catch (err) {
    sendError(req, res, err);
  }
}
