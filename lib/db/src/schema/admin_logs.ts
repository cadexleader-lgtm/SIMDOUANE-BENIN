import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const adminLogsTable = pgTable("admin_logs", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  adminClerkId: text("admin_clerk_id").notNull(),
  action:      text("action").notNull(),
  targetId:    text("target_id"),
  targetType:  text("target_type"),
  details:     jsonb("details"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});
