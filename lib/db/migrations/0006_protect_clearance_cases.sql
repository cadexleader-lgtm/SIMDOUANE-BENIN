-- Dossiers véhicules (0005) : même verrouillage que les autres tables.
-- RLS activé sans policy, aucun droit pour les rôles publics anon/authenticated
-- de Supabase (tables ET séquence de référence). Accès uniquement par l'API.
ALTER TABLE "vehicles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clearance_cases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "case_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON TABLE vehicles, clearance_cases, case_events FROM %I', r);
      EXECUTE format('REVOKE ALL ON SEQUENCE clearance_case_reference_seq FROM %I', r);
    END IF;
  END LOOP;
END
$$;--> statement-breakpoint

-- Historique des dossiers en ajout seul (même fonction que le journal de
-- sécurité, migration 0003).
CREATE TRIGGER "case_events_append_only"
  BEFORE UPDATE OR DELETE ON "case_events"
  FOR EACH ROW EXECUTE FUNCTION "public"."simdouane_reject_history_change"();
