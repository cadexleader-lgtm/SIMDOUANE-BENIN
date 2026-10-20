import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userStatusEnum = pgEnum("user_status", ["active", "disabled", "suspended"]);

export const usersTable = pgTable("users", {
  id:        text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  clerkId:   text("clerk_id").notNull().unique(),
  email:     text("email").notNull().unique(),
  fullName:  text("full_name").notNull(),
  phone:     text("phone"),
  whatsapp:  text("whatsapp"),
  poste:     text("poste"),   // e.g. Transitaire, Importateur, Commissionnaire en douane
  onboarded: text("onboarded").notNull().default("false"), // "true" after onboarding form
  status:    userStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
