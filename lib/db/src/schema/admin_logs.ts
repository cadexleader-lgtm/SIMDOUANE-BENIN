import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const adminLogsTable = pgTable("admin_logs", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  // Administrator who acted. Rows written before the switch from Clerk only
  // carry admin_clerk_id.
  adminUserId: text("admin_user_id").references(() => usersTable.id),
  adminClerkId: text("admin_clerk_id"),
  action:      text("action").notNull(),
  targetId:    text("target_id"),
  targetType:  text("target_type"),
  details:     jsonb("details"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("admin_logs_admin_user_id_idx").on(t.adminUserId)]);
