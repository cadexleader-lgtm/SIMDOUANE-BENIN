-- Estimations gratuites sans compte (2026-11-15). Strictement additif : une
-- nouvelle table, aucune donnée existante modifiée. Elle compte les estimations
-- faites par un navigateur sans compte, reconnu par un identifiant aléatoire
-- créé par ce navigateur (aucune donnée personnelle).
CREATE TABLE "anonymous_devices" (
	"device_id" text PRIMARY KEY NOT NULL,
	"estimates_count" integer DEFAULT 0 NOT NULL,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Même verrouillage que les autres tables : RLS activé sans policy, aucun droit
-- pour les rôles publics anon/authenticated de Supabase. Accès par l'API seule.
ALTER TABLE "anonymous_devices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON TABLE anonymous_devices FROM %I', r);
    END IF;
  END LOOP;
END
$$;
