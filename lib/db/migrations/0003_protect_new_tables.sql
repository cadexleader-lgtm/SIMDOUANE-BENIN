-- 1. Même verrouillage que 0001 pour les tables créées en 0002 : RLS activé
--    sans policy et aucun droit pour les rôles anon/authenticated de Supabase.
--    L'application n'y accède que par l'API (rôle propriétaire des tables).
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "organization_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "stored_files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "transitaire_applications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "transitaire_application_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "transitaire_access_decisions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format(
        'REVOKE ALL ON TABLE organizations, organization_members, stored_files, transitaire_applications, transitaire_application_documents, transitaire_access_decisions, audit_logs FROM %I',
        r
      );
    END IF;
  END LOOP;
END
$$;--> statement-breakpoint

-- 2. Historiques en ajout seul : le journal de sécurité et les décisions sur
--    les droits transitaire ne peuvent être ni modifiés ni supprimés ligne par
--    ligne, même par erreur de l'application.
CREATE FUNCTION "public"."simdouane_reject_history_change"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'La table % est en ajout seul : % refusé', TG_TABLE_NAME, TG_OP;
END
$$;--> statement-breakpoint
CREATE TRIGGER "audit_logs_append_only"
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION "public"."simdouane_reject_history_change"();--> statement-breakpoint
CREATE TRIGGER "transitaire_access_decisions_append_only"
  BEFORE UPDATE OR DELETE ON "transitaire_access_decisions"
  FOR EACH ROW EXECUTE FUNCTION "public"."simdouane_reject_history_change"();
