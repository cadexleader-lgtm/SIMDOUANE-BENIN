import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createClerkClient } from "@clerk/express";

const clerkClientInstance = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export async function getOrCreateUser(clerkUserId: string, req: any) {
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkUserId))
    .limit(1);

  if (existing) return existing;

  let email = "unknown@user.com";
  let fullName = "Utilisateur";

  try {
    const clerkUser = await clerkClientInstance.users.getUser(clerkUserId);
    email = clerkUser.emailAddresses[0]?.emailAddress ?? email;
    const first = clerkUser.firstName ?? "";
    const last = clerkUser.lastName ?? "";
    fullName = [first, last].filter(Boolean).join(" ") || clerkUser.username || "Utilisateur";
  } catch (e) {
    req.log.warn({ err: e }, "Could not fetch Clerk user info");
  }

  const [created] = await db
    .insert(usersTable)
    .values({ clerkId: clerkUserId, email, fullName })
    .onConflictDoUpdate({
      target: usersTable.clerkId,
      set: { email, updatedAt: new Date() },
    })
    .returning();

  return created;
}
