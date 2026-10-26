import { pgTable, text, timestamp, integer, date, pgEnum, pgSequence, jsonb, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// Phase 3: a vehicle import file ("dossier") prepared by its owner.
// It is a preparation and follow-up tool: being "ready" here never means the
// file has been lodged with Customs (Douanes, GUCE, Bénin Control).

export const vehicleConditionEnum = pgEnum("vehicle_condition", ["neuf", "occasion"]);

export const vehiclesTable = pgTable(
  "vehicles",
  {
    id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    ownerUserId: text("owner_user_id").notNull().references(() => usersTable.id),
    make:        text("make").notNull(),   // marque
    model:       text("model"),            // modèle
    year:        integer("year"),
    vin:         text("vin"),              // numéro de châssis (VIN), normalised upper-case
    condition:   vehicleConditionEnum("condition"),
    createdAt:   timestamp("created_at").notNull().defaultNow(),
    updatedAt:   timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("vehicles_owner_user_id_idx").on(t.ownerUserId)],
);

// Where the vehicle is when the file is created (parcours A / parcours B).
export const caseArrivalSituationEnum = pgEnum("case_arrival_situation", ["not_arrived", "arrived"]);

// Internal SimDouane statuses. More values are added in later phases
// (ALTER TYPE ... ADD VALUE, non destructive).
export const clearanceCaseStatusEnum = pgEnum("clearance_case_status", ["draft", "incomplete", "ready"]);

// Global counter behind the human reference SDB-<year>-<number>.
export const clearanceCaseReferenceSeq = pgSequence("clearance_case_reference_seq", { startWith: 1 });

export const clearanceCasesTable = pgTable(
  "clearance_cases",
  {
    id:                   text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    reference:            text("reference").notNull().unique(), // SDB-2026-000123
    // Access is granted through the owner only in phase 3; invited parties
    // (transitaire) are added in phase 5 by a separate table.
    ownerUserId:          text("owner_user_id").notNull().references(() => usersTable.id),
    vehicleId:            text("vehicle_id").notNull().unique().references(() => vehiclesTable.id),
    arrivalSituation:     caseArrivalSituationEnum("arrival_situation").notNull(),
    status:               clearanceCaseStatusEnum("status").notNull().default("draft"),
    statusChangedAt:      timestamp("status_changed_at").notNull().defaultNow(),
    originCountry:        text("origin_country"),       // provenance
    departurePort:        text("departure_port"),
    shippedAt:            date("shipped_at"),
    estimatedArrivalDate: date("estimated_arrival_date"),
    arrivalDate:          date("arrival_date"),
    arrivalPort:          text("arrival_port").notNull().default("Cotonou"),
    transportReference:   text("transport_reference"),  // e.g. connaissement / BL number
    existingReferences:   text("existing_references"),  // references already obtained, if any
    formalitiesDone:      text("formalities_done"),     // parcours B: steps already done
    knownBlockers:        text("known_blockers"),
    notes:                text("notes"),                // informations complémentaires
    createdAt:            timestamp("created_at").notNull().defaultNow(),
    updatedAt:            timestamp("updated_at").notNull().defaultNow(),
    // Archived by its owner: hidden, kept (retention policy still to decide).
    deletedAt:            timestamp("deleted_at"),
  },
  (t) => [
    index("clearance_cases_owner_user_id_idx").on(t.ownerUserId, t.updatedAt),
  ],
);

// History of a file. `sourceCategory` keeps the three kinds of status apart:
// "simdouane" (action in the platform), "professionnel" (declared by a
// transitaire, phase 5), "officiel_confirme" (backed by an official proof).
// Append-only (trigger, migration 0005).
export const caseEventsTable = pgTable(
  "case_events",
  {
    id:             text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    caseId:         text("case_id").notNull().references(() => clearanceCasesTable.id),
    actorUserId:    text("actor_user_id").references(() => usersTable.id),
    type:           text("type").notNull(), // created | updated | status_changed | archived
    fromStatus:     text("from_status"),
    toStatus:       text("to_status"),
    sourceCategory: text("source_category").notNull().default("simdouane"),
    details:        jsonb("details"),
    createdAt:      timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("case_events_case_id_created_at_idx").on(t.caseId, t.createdAt),
    index("case_events_actor_user_id_idx").on(t.actorUserId),
  ],
);

export type Vehicle = typeof vehiclesTable.$inferSelect;
export type ClearanceCase = typeof clearanceCasesTable.$inferSelect;
export type CaseEvent = typeof caseEventsTable.$inferSelect;
