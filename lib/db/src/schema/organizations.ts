import { pgTable, text, timestamp, pgEnum, primaryKey } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// Phase 2: an "entreprise" account owns exactly one organization holding its
// legal name and IFU. Team members and organization-level sharing come later
// (phase 5) and will reuse these tables.
export const organizationKindEnum = pgEnum("organization_kind", ["entreprise"]);
export const organizationMemberRoleEnum = pgEnum("organization_member_role", ["owner", "member"]);

export const organizationsTable = pgTable("organizations", {
  id:              text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  kind:            organizationKindEnum("kind").notNull().default("entreprise"),
  legalName:       text("legal_name").notNull(),
  ifu:             text("ifu"),
  createdByUserId: text("created_by_user_id").notNull().references(() => usersTable.id),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

export const organizationMembersTable = pgTable(
  "organization_members",
  {
    organizationId: text("organization_id").notNull().references(() => organizationsTable.id),
    userId:         text("user_id").notNull().references(() => usersTable.id),
    role:           organizationMemberRoleEnum("role").notNull(),
    createdAt:      timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.userId] })],
);

export type Organization = typeof organizationsTable.$inferSelect;
