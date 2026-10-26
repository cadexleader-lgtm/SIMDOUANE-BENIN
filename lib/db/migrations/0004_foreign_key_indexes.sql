CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_plan_id_idx" ON "subscriptions" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "simulations_user_id_created_at_idx" ON "simulations" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "upgrade_requests_user_id_idx" ON "upgrade_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "organization_members_user_id_idx" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "organizations_created_by_user_id_idx" ON "organizations" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "stored_files_uploaded_by_user_id_idx" ON "stored_files" USING btree ("uploaded_by_user_id");--> statement-breakpoint
CREATE INDEX "transitaire_access_decisions_user_id_idx" ON "transitaire_access_decisions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transitaire_access_decisions_application_id_idx" ON "transitaire_access_decisions" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "transitaire_access_decisions_decided_by_user_id_idx" ON "transitaire_access_decisions" USING btree ("decided_by_user_id");--> statement-breakpoint
CREATE INDEX "transitaire_applications_user_id_idx" ON "transitaire_applications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transitaire_applications_decided_by_user_id_idx" ON "transitaire_applications" USING btree ("decided_by_user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
-- Contrôle de sécurité Supabase (function_search_path_mutable) : chemin de
-- recherche fixe pour la fonction des historiques en ajout seul (elle
-- n'utilise aucune table, un chemin vide suffit).
ALTER FUNCTION "public"."simdouane_reject_history_change"() SET search_path = '';
