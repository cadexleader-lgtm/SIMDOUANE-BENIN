import { pgTable, text, timestamp, pgEnum, primaryKey, uniqueIndex, check, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { storedFilesTable } from "./stored_files";

export const transitaireApplicationStatusEnum = pgEnum("transitaire_application_status", [
  "submitted",
  "approved",
  "rejected",
]);

// A request to obtain transitaire permissions. The agrément number is only a
// declaration: the administrator checks it against the supporting documents.
export const transitaireApplicationsTable = pgTable(
  "transitaire_applications",
  {
    id:              text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId:          text("user_id").notNull().references(() => usersTable.id),
    agrementNumber:  text("agrement_number").notNull(),
    message:         text("message"),
    status:          transitaireApplicationStatusEnum("status").notNull().default("submitted"),
    createdAt:       timestamp("created_at").notNull().defaultNow(),
    decidedAt:       timestamp("decided_at"),
    decidedByUserId: text("decided_by_user_id").references(() => usersTable.id),
    decisionReason:  text("decision_reason"),
  },
  (t) => [
    // At most one application under review per account.
    uniqueIndex("transitaire_applications_one_submitted_per_user")
      .on(t.userId)
      .where(sql`${t.status} = 'submitted'`),
    index("transitaire_applications_user_id_idx").on(t.userId),
    index("transitaire_applications_decided_by_user_id_idx").on(t.decidedByUserId),
  ],
);

export const transitaireApplicationDocumentsTable = pgTable(
  "transitaire_application_documents",
  {
    applicationId: text("application_id").notNull().references(() => transitaireApplicationsTable.id),
    fileId:        text("file_id").notNull().unique().references(() => storedFilesTable.id),
    createdAt:     timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.applicationId, t.fileId] })],
);

export const transitaireDecisionEnum = pgEnum("transitaire_decision", [
  "approved",
  "rejected",
  "suspended",
  "reinstated",
  "revoked",
]);

// Every administrator decision on transitaire rights: who, when, why.
// Append-only (enforced by a trigger, migration 0003).
export const transitaireAccessDecisionsTable = pgTable(
  "transitaire_access_decisions",
  {
    id:              text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId:          text("user_id").notNull().references(() => usersTable.id),
    applicationId:   text("application_id").references(() => transitaireApplicationsTable.id),
    decision:        transitaireDecisionEnum("decision").notNull(),
    reason:          text("reason"),
    decidedByUserId: text("decided_by_user_id").notNull().references(() => usersTable.id),
    createdAt:       timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    check(
      "transitaire_access_decisions_reason_required",
      sql`${t.decision} NOT IN ('suspended', 'revoked') OR length(trim(coalesce(${t.reason}, ''))) > 0`,
    ),
    index("transitaire_access_decisions_user_id_idx").on(t.userId),
    index("transitaire_access_decisions_application_id_idx").on(t.applicationId),
    index("transitaire_access_decisions_decided_by_user_id_idx").on(t.decidedByUserId),
  ],
);

export type TransitaireApplication = typeof transitaireApplicationsTable.$inferSelect;
