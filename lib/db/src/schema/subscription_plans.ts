import { pgTable, text, integer, numeric, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subscriptionPlansTable = pgTable("subscription_plans", {
  id:                  text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:                text("name").notNull(),
  slug:                text("slug").notNull().unique(),
  priceMonthly:        numeric("price_monthly", { precision: 10, scale: 2 }).notNull().default("0"),
  simulationsPerMonth: integer("simulations_per_month"), // null = unlimited
  features:            jsonb("features").notNull().$type<string[]>().default([]),
  isActive:            boolean("is_active").notNull().default(true),
  createdAt:           timestamp("created_at").notNull().defaultNow(),
  updatedAt:           timestamp("updated_at").notNull().defaultNow(),
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlansTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlansTable.$inferSelect;
