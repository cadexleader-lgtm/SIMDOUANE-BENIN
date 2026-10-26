import { db, organizationsTable, organizationMembersTable, type Organization } from "@workspace/db";
import { and, asc, eq } from "drizzle-orm";

type Executor = Pick<typeof db, "select" | "insert" | "update">;

/**
 * Phase 2: the company of an "entreprise" account is the organization it owns.
 * Team members (role "member") and organization-level sharing come in phase 5.
 */
export async function findOwnedOrganization(userId: string, executor: Executor = db): Promise<Organization | null> {
  const [row] = await executor
    .select({ org: organizationsTable })
    .from(organizationMembersTable)
    .innerJoin(organizationsTable, eq(organizationMembersTable.organizationId, organizationsTable.id))
    .where(and(eq(organizationMembersTable.userId, userId), eq(organizationMembersTable.role, "owner")))
    .orderBy(asc(organizationMembersTable.createdAt))
    .limit(1);
  return row?.org ?? null;
}

export async function upsertOwnedOrganization(
  userId: string,
  data: { legalName: string; ifu: string | null },
  executor: Executor,
): Promise<Organization> {
  const existing = await findOwnedOrganization(userId, executor);
  if (existing) {
    const [updated] = await executor
      .update(organizationsTable)
      .set({ legalName: data.legalName, ifu: data.ifu, updatedAt: new Date() })
      .where(eq(organizationsTable.id, existing.id))
      .returning();
    return updated;
  }
  const [created] = await executor
    .insert(organizationsTable)
    .values({ legalName: data.legalName, ifu: data.ifu, createdByUserId: userId })
    .returning();
  await executor.insert(organizationMembersTable).values({ organizationId: created.id, userId, role: "owner" });
  return created;
}

export function mapOrganization(org: Organization | null) {
  return org ? { id: org.id, legalName: org.legalName, ifu: org.ifu ?? null } : null;
}
