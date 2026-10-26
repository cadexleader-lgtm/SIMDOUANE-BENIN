CREATE TYPE "public"."case_arrival_situation" AS ENUM('not_arrived', 'arrived');--> statement-breakpoint
CREATE TYPE "public"."clearance_case_status" AS ENUM('draft', 'incomplete', 'ready');--> statement-breakpoint
CREATE TYPE "public"."vehicle_condition" AS ENUM('neuf', 'occasion');--> statement-breakpoint
CREATE SEQUENCE "public"."clearance_case_reference_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "case_events" (
	"id" text PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"actor_user_id" text,
	"type" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"source_category" text DEFAULT 'simdouane' NOT NULL,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clearance_cases" (
	"id" text PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"vehicle_id" text NOT NULL,
	"arrival_situation" "case_arrival_situation" NOT NULL,
	"status" "clearance_case_status" DEFAULT 'draft' NOT NULL,
	"status_changed_at" timestamp DEFAULT now() NOT NULL,
	"origin_country" text,
	"departure_port" text,
	"shipped_at" date,
	"estimated_arrival_date" date,
	"arrival_date" date,
	"arrival_port" text DEFAULT 'Cotonou' NOT NULL,
	"transport_reference" text,
	"existing_references" text,
	"formalities_done" text,
	"known_blockers" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "clearance_cases_reference_unique" UNIQUE("reference"),
	CONSTRAINT "clearance_cases_vehicle_id_unique" UNIQUE("vehicle_id")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"make" text NOT NULL,
	"model" text,
	"year" integer,
	"vin" text,
	"condition" "vehicle_condition",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_case_id_clearance_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."clearance_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clearance_cases" ADD CONSTRAINT "clearance_cases_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clearance_cases" ADD CONSTRAINT "clearance_cases_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "case_events_case_id_created_at_idx" ON "case_events" USING btree ("case_id","created_at");--> statement-breakpoint
CREATE INDEX "case_events_actor_user_id_idx" ON "case_events" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "clearance_cases_owner_user_id_idx" ON "clearance_cases" USING btree ("owner_user_id","updated_at");--> statement-breakpoint
CREATE INDEX "vehicles_owner_user_id_idx" ON "vehicles" USING btree ("owner_user_id");