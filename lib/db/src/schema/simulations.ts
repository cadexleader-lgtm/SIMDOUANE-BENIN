import { pgTable, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const simulationsTable = pgTable("simulations", {
  id:           text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:       text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  marque:       text("marque").notNull(),
  modele:       text("modele").notNull(),
  annee:        integer("annee").notNull(),
  cylindree:    text("cylindree").notNull(),
  carburant:    text("carburant").notNull(),
  valeurCIF:    numeric("valeur_cif", { precision: 15, scale: 2 }).notNull(),
  joursAuPort:  integer("jours_au_port").notNull().default(0),
  regime:       text("regime").notNull(),
  totalDouane:  numeric("total_douane",  { precision: 15, scale: 2 }).notNull(),
  totalPort:    numeric("total_port",    { precision: 15, scale: 2 }).notNull(),
  totalGeneral: numeric("total_general", { precision: 15, scale: 2 }).notNull(),
  condition:    text("condition").notNull().default("Occasion"),
  powertrain:   text("powertrain"),
  referenceDate: text("reference_date"),
  regulatoryYear: integer("regulatory_year"),
  calculatorVersion: text("calculator_version").notNull().default("historical"),
  regulatoryConfigVersion: text("regulatory_config_version"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

export const insertSimulationSchema = createInsertSchema(simulationsTable).omit({ id: true, createdAt: true });
export type InsertSimulation = z.infer<typeof insertSimulationSchema>;
export type SimulationRow = typeof simulationsTable.$inferSelect;
