import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// Journal of sensitive operations (access to private files, permission
// changes, account conflicts). Append-only (enforced by a trigger, migration 0003).
// The older `admin_logs` table keeps serving the existing admin screens.
export const auditLogsTable = pgTable(
  "audit_logs",
  {
    id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    actorUserId: text("actor_user_id").references(() => usersTable.id),
    actorRole:   text("actor_role").notNull(), // "user" | "admin" | "system"
    action:      text("action").notNull(),
    targetType:  text("target_type"),
    targetId:    text("target_id"),
    details:     jsonb("details"),
    createdAt:   timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("audit_logs_target_idx").on(t.targetType, t.targetId),
    index("audit_logs_created_at_idx").on(t.createdAt),
    index("audit_logs_actor_user_id_idx").on(t.actorUserId),
  ],
);

export type AuditLog = typeof auditLogsTable.$inferSelect;
