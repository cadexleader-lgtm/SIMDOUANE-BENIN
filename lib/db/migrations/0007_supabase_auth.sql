-- Passage de Clerk à Supabase Auth (2026-10-30). Aucune donnée supprimée ni
-- modifiée : deux colonnes ajoutées (lien vers le compte Supabase Auth, auteur
-- des actions d'administration) et deux colonnes Clerk rendues facultatives
-- (les anciens comptes gardent leur identifiant Clerk).
ALTER TABLE "users" ALTER COLUMN "clerk_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_logs" ALTER COLUMN "admin_clerk_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth_user_id" text;--> statement-breakpoint
ALTER TABLE "admin_logs" ADD COLUMN "admin_user_id" text;--> statement-breakpoint
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_logs_admin_user_id_idx" ON "admin_logs" USING btree ("admin_user_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_auth_user_id_unique" UNIQUE("auth_user_id");