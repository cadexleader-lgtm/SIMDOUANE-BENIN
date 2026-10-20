import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// Server-side admin allowlist (the real barrier; the UI only hides links).
// ADMIN_EMAILS: comma-separated list. Defaults to the historical admin.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "hazoumeclarence@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

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

/**
 * Admin check: look up email from our DB (more reliable than JWT sessionClaims,
 * which may not include email by default in Clerk's dev/prod JWT templates).
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const rows = await db
      .select({ email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.clerkId, auth.userId))
      .limit(1);

    const email = rows[0]?.email ?? "";
    if (!ADMIN_EMAILS.includes(email.toLowerCase())) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    (req as any).clerkUserId = auth.userId;
    next();
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
}
