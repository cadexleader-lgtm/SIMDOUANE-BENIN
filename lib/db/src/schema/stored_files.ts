import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// Metadata of every private file. The bytes live in the private file store
// (local disk in development, private Supabase bucket in production); they
// are only reachable through the API, which checks permissions and hands out
// short-lived links.
export const storedFilesTable = pgTable("stored_files", {
  id:               text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  purpose:          text("purpose").notNull(), // e.g. "transitaire_justificatif"
  uploadedByUserId: text("uploaded_by_user_id").notNull().references(() => usersTable.id),
  storageDriver:    text("storage_driver").notNull(),
  storageKey:       text("storage_key").notNull().unique(),
  originalName:     text("original_name").notNull(), // sanitized, display only
  contentType:      text("content_type").notNull(),   // detected from the bytes
  sizeBytes:        integer("size_bytes").notNull(),
  sha256:           text("sha256").notNull(),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
  deletedAt:        timestamp("deleted_at"),
});

export type StoredFile = typeof storedFilesTable.$inferSelect;
