import { db, auditLogsTable } from "@workspace/db";

type Executor = Pick<typeof db, "insert">;

export type AuditEntry = {
  actorUserId: string | null;
  actorRole: "user" | "admin" | "system";
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
};

/** Appends to the security journal (append-only table, see migration 0003). */
export async function audit(entry: AuditEntry, executor: Executor = db) {
  await executor.insert(auditLogsTable).values({
    actorUserId: entry.actorUserId,
    actorRole: entry.actorRole,
    action: entry.action,
    targetType: entry.targetType ?? null,
    targetId: entry.targetId ?? null,
    details: entry.details ?? null,
  });
}
