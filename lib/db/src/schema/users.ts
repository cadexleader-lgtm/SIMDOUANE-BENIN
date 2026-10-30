import { pgTable, text, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userStatusEnum = pgEnum("user_status", ["active", "disabled", "suspended"]);

// Particulier or company importer. Company details live in `organizations`
// so that multi-member organizations can be added later without migration.
export const accountKindEnum = pgEnum("account_kind", ["particulier", "entreprise"]);

// Only "active" grants transitaire permissions. It changes exclusively through
// an administrator decision (see transitaire_access_decisions), never from the
// self-declared `poste` field.
export const transitaireStatusEnum = pgEnum("transitaire_status", [
  "none",
  "pending",
  "active",
  "suspended",
  "revoked",
]);

export const usersTable = pgTable("users", {
  id:        text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  // Supabase Auth user id (auth.users.id) of the account. Null for accounts
  // created before the switch from Clerk, until they are linked manually.
  authUserId: text("auth_user_id").unique(),
  // Clerk user id of accounts created before the switch (Replit era). Kept
  // for history and manual linking; null for new accounts.
  clerkId:   text("clerk_id").unique(),
  email:     text("email").notNull().unique(),
  // Whether the identity provider reported `email` as confirmed. Required for admin rights.
  emailVerified: boolean("email_verified").notNull().default(false),
  fullName:  text("full_name").notNull(),
  phone:     text("phone"),
  whatsapp:  text("whatsapp"),
  poste:     text("poste"),   // e.g. Transitaire, Importateur, Commissionnaire en douane (declarative only)
  onboarded: text("onboarded").notNull().default("false"), // "true" after onboarding form
  status:    userStatusEnum("status").notNull().default("active"),
  accountKind: accountKindEnum("account_kind").notNull().default("particulier"),
  transitaireStatus: transitaireStatusEnum("transitaire_status").notNull().default("none"),
  transitaireStatusChangedAt: timestamp("transitaire_status_changed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
