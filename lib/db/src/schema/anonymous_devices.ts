import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Free estimates used by a visitor without an account. `deviceId` is a random
 * identifier created by the browser (kept in its storage): it recognises the
 * same browser on the same phone, nothing else. No personal data.
 */
export const anonymousDevicesTable = pgTable("anonymous_devices", {
  deviceId:       text("device_id").primaryKey(),
  estimatesCount: integer("estimates_count").notNull().default(0),
  firstSeenAt:    timestamp("first_seen_at").notNull().defaultNow(),
  lastSeenAt:     timestamp("last_seen_at").notNull().defaultNow(),
});

export type AnonymousDevice = typeof anonymousDevicesTable.$inferSelect;
