import { pgTable, text, timestamp, pgEnum, integer, numeric, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/**
 * The legacy values remain in the enum so existing rows can still be read.
 * New requests use the explicit Mobile Money workflow statuses.
 */
export const upgradeRequestStatusEnum = pgEnum("upgrade_request_status", [
  "pending",
  "processed",
  "dismissed",
  "submitted",
  "payment_under_review",
  "approved",
  "activated",
  "rejected",
  "cancelled",
]);

export const upgradeRequestsTable = pgTable("upgrade_requests", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:      text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  userEmail:   text("user_email").notNull(),
  userFullName: text("user_full_name"),
  planWanted:  text("plan_wanted"),      // "Standard" | "Pro"
  durationMonths: integer("duration_months"),
  mobileMoneyPhone: text("mobile_money_phone"),
  mobileMoneyOperator: text("mobile_money_operator"),
  transactionReference: text("transaction_reference"),
  declaredAmount: numeric("declared_amount", { precision: 15, scale: 2 }),
  receiptUrl: text("receipt_url"),
  message:     text("message"),
  status:      upgradeRequestStatusEnum("status").notNull().default("submitted"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
  // SimDouane user id of the administrator (Clerk user id for requests
  // processed before the switch to Supabase Auth, 2026-10-30).
  processedBy: text("processed_by"),
  processedNote: text("processed_note"),
  rejectionReason: text("rejection_reason"),
}, (t) => [index("upgrade_requests_user_id_idx").on(t.userId)]);

export type UpgradeRequest = typeof upgradeRequestsTable.$inferSelect;
