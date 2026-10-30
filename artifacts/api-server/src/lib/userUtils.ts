import { db } from "@workspace/db";
import { usersTable, type User } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { HttpError } from "./httpErrors";
import { audit } from "./audit";
import { fetchAuthAccount } from "./auth/identity";

/**
 * Returns the application user linked to this Supabase Auth account, creating
 * it on first sign-in.
 *
 * An existing account is NEVER linked automatically on the basis of an email
 * address: if another account already uses the email (typically an account
 * created on the former Replit-managed Clerk instance), the request is refused
 * with ACCOUNT_LINK_REQUIRED and the conflict is logged for a manual,
 * verified linking procedure.
 */
export async function getOrCreateUser(authUserId: string, _req?: unknown): Promise<User> {
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.authUserId, authUserId)).limit(1);
  if (existing) return existing;

  const account = await fetchAuthAccount(authUserId);
  if (!account) {
    throw new HttpError(401, "ACCOUNT_NOT_FOUND", "Ce compte n'existe plus. Reconnectez-vous.");
  }
  if (!account.email) {
    throw new HttpError(422, "EMAIL_REQUIRED", "Une adresse e-mail est nécessaire pour utiliser SimDouane.");
  }
  const email = account.email;
  const fullName = account.fullName || "Utilisateur";

  const [sameEmail] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(sql`lower(${usersTable.email}) = lower(${email})`)
    .limit(1);
  if (sameEmail) {
    await audit({
      actorUserId: null,
      actorRole: "system",
      action: "account.email_conflict",
      targetType: "user",
      targetId: sameEmail.id,
      details: { newAuthUserId: authUserId, emailVerified: account.emailConfirmed },
    });
    throw new HttpError(
      409,
      "ACCOUNT_LINK_REQUIRED",
      "Un compte SimDouane existe déjà avec cette adresse. Contactez le support pour le rattacher.",
    );
  }

  await db
    .insert(usersTable)
    .values({ authUserId, email, emailVerified: account.emailConfirmed, fullName })
    .onConflictDoNothing({ target: usersTable.authUserId }); // concurrent first requests
  const [created] = await db.select().from(usersTable).where(eq(usersTable.authUserId, authUserId)).limit(1);
  return created;
}
