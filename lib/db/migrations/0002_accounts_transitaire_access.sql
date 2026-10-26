CREATE TYPE "public"."account_kind" AS ENUM('particulier', 'entreprise');--> statement-breakpoint
CREATE TYPE "public"."transitaire_status" AS ENUM('none', 'pending', 'active', 'suspended', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."organization_kind" AS ENUM('entreprise');--> statement-breakpoint
CREATE TYPE "public"."organization_member_role" AS ENUM('owner', 'member');--> statement-breakpoint
CREATE TYPE "public"."transitaire_application_status" AS ENUM('submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."transitaire_decision" AS ENUM('approved', 'rejected', 'suspended', 'reinstated', 'revoked');--> statement-breakpoint
CREATE TABLE "organization_members" (
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "organization_member_role" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_members_organization_id_user_id_pk" PRIMARY KEY("organization_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "organization_kind" DEFAULT 'entreprise' NOT NULL,
	"legal_name" text NOT NULL,
	"ifu" text,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stored_files" (
	"id" text PRIMARY KEY NOT NULL,
	"purpose" text NOT NULL,
	"uploaded_by_user_id" text NOT NULL,
	"storage_driver" text NOT NULL,
	"storage_key" text NOT NULL,
	"original_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "stored_files_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "transitaire_access_decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"application_id" text,
	"decision" "transitaire_decision" NOT NULL,
	"reason" text,
	"decided_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transitaire_access_decisions_reason_required" CHECK ("transitaire_access_decisions"."decision" NOT IN ('suspended', 'revoked') OR length(trim(coalesce("transitaire_access_decisions"."reason", ''))) > 0)
);
--> statement-breakpoint
CREATE TABLE "transitaire_application_documents" (
	"application_id" text NOT NULL,
	"file_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transitaire_application_documents_application_id_file_id_pk" PRIMARY KEY("application_id","file_id"),
	CONSTRAINT "transitaire_application_documents_file_id_unique" UNIQUE("file_id")
);
--> statement-breakpoint
CREATE TABLE "transitaire_applications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"agrement_number" text NOT NULL,
	"message" text,
	"status" "transitaire_application_status" DEFAULT 'submitted' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"decided_at" timestamp,
	"decided_by_user_id" text,
	"decision_reason" text
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_user_id" text,
	"actor_role" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_kind" "account_kind" DEFAULT 'particulier' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "transitaire_status" "transitaire_status" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "transitaire_status_changed_at" timestamp;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stored_files" ADD CONSTRAINT "stored_files_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transitaire_access_decisions" ADD CONSTRAINT "transitaire_access_decisions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transitaire_access_decisions" ADD CONSTRAINT "transitaire_access_decisions_application_id_transitaire_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."transitaire_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transitaire_access_decisions" ADD CONSTRAINT "transitaire_access_decisions_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transitaire_application_documents" ADD CONSTRAINT "transitaire_application_documents_application_id_transitaire_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."transitaire_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transitaire_application_documents" ADD CONSTRAINT "transitaire_application_documents_file_id_stored_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."stored_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transitaire_applications" ADD CONSTRAINT "transitaire_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transitaire_applications" ADD CONSTRAINT "transitaire_applications_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "transitaire_applications_one_submitted_per_user" ON "transitaire_applications" USING btree ("user_id") WHERE "transitaire_applications"."status" = 'submitted';--> statement-breakpoint
CREATE INDEX "audit_logs_target_idx" ON "audit_logs" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");