CREATE TYPE "public"."user_status" AS ENUM('active', 'disabled', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."upgrade_request_status" AS ENUM('pending', 'processed', 'dismissed', 'submitted', 'payment_under_review', 'approved', 'activated', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"phone" text,
	"whatsapp" text,
	"poste" text,
	"onboarded" text DEFAULT 'false' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"price_monthly" numeric(10, 2) DEFAULT '0' NOT NULL,
	"simulations_per_month" integer,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "simulations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"marque" text NOT NULL,
	"modele" text NOT NULL,
	"annee" integer NOT NULL,
	"cylindree" text NOT NULL,
	"carburant" text NOT NULL,
	"valeur_cif" numeric(15, 2) NOT NULL,
	"jours_au_port" integer DEFAULT 0 NOT NULL,
	"regime" text NOT NULL,
	"total_douane" numeric(15, 2) NOT NULL,
	"total_port" numeric(15, 2) NOT NULL,
	"total_general" numeric(15, 2) NOT NULL,
	"condition" text DEFAULT 'Occasion' NOT NULL,
	"powertrain" text,
	"reference_date" text,
	"regulatory_year" integer,
	"calculator_version" text DEFAULT 'historical' NOT NULL,
	"regulatory_config_version" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"admin_clerk_id" text NOT NULL,
	"action" text NOT NULL,
	"target_id" text,
	"target_type" text,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upgrade_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_email" text NOT NULL,
	"user_full_name" text,
	"plan_wanted" text,
	"duration_months" integer,
	"mobile_money_phone" text,
	"mobile_money_operator" text,
	"transaction_reference" text,
	"declared_amount" numeric(15, 2),
	"receipt_url" text,
	"message" text,
	"status" "upgrade_request_status" DEFAULT 'submitted' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"processed_by" text,
	"processed_note" text,
	"rejection_reason" text
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upgrade_requests" ADD CONSTRAINT "upgrade_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;