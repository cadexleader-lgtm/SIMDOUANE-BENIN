import { db } from "@workspace/db";
import { usersTable, type User } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { createClerkClient } from "@clerk/express";
import { HttpError } from "./httpErrors";
import { audit } from "./audit";

const clerkClientInstance = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

type ClerkUser = Awaited<ReturnType<typeof clerkClientInstance.users.getUser>>;

export async function fetchClerkUser(clerkUserId: string): Promise<ClerkUser> {
  try {
    return await clerkClientInstance.users.getUser(clerkUserId);
  } catch (err) {
    throw new HttpError(503, "AUTH_PROVIDER_UNAVAILABLE", "Service d'authentification indisponible, réessayez.", {
      cause: String(err),
    });
  }
}

/** The account's primary email, and whether Clerk has verified it. */
export function primaryEmailOf(clerkUser: ClerkUser): { email: string; verified: boolean } | null {
  const primary =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId) ?? clerkUser.emailAddresses[0];
  if (!primary) return null;
  return { email: primary.emailAddress, verified: primary.verification?.status === "verified" };
}

/** True when Clerk lists `email` on this account as verified. */
export function hasVerifiedEmail(clerkUser: ClerkUser, email: string): boolean {
  return clerkUser.emailAddresses.some(
    (e) => e.emailAddress.toLowerCase() === email.toLowerCase() && e.verification?.status === "verified",
  );
}

/**
 * Returns the application user linked to this Clerk account, creating it on
 * first sign-in.
 *
 * An existing account is NEVER linked automatically on the basis of an email
 * address: if another account already uses the email (typically an account
 * created on the former Replit-managed Clerk instance), the request is refused
 * with ACCOUNT_LINK_REQUIRED and the conflict is logged for a manual,
 * verified linking procedure.
 */
export async function getOrCreateUser(clerkUserId: string, _req?: unknown): Promise<User> {
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
  if (existing) return existing;

  const clerkUser = await fetchClerkUser(clerkUserId);
  const primary = primaryEmailOf(clerkUser);
  if (!primary) {
    throw new HttpError(422, "EMAIL_REQUIRED", "Une adresse e-mail est nécessaire pour utiliser SimDouane.");
  }
  const fullName =
    [clerkUser.firstName ?? "", clerkUser.lastName ?? ""].filter(Boolean).join(" ") ||
    clerkUser.username ||
    "Utilisateur";

  const [sameEmail] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(sql`lower(${usersTable.email}) = lower(${primary.email})`)
    .limit(1);
  if (sameEmail) {
    await audit({
      actorUserId: null,
      actorRole: "system",
      action: "account.email_conflict",
      targetType: "user",
      targetId: sameEmail.id,
      details: { newClerkId: clerkUserId, emailVerified: primary.verified },
    });
    throw new HttpError(
      409,
      "ACCOUNT_LINK_REQUIRED",
      "Un compte SimDouane existe déjà avec cette adresse. Contactez le support pour le rattacher.",
    );
  }

  await db
    .insert(usersTable)
    .values({ clerkId: clerkUserId, email: primary.email, emailVerified: primary.verified, fullName })
    .onConflictDoNothing({ target: usersTable.clerkId }); // concurrent first requests
  const [created] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
  return created;
}
