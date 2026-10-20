-- SimDouane n'accède à la base QUE par l'API Express (connexion serveur via
-- DATABASE_URL). Aucun client navigateur ne doit lire ces tables directement.
--
-- Sur Supabase, le schéma public est aussi exposé par l'API REST (PostgREST)
-- aux rôles `anon` et `authenticated`, dont la clé est publique. On active
-- donc RLS sans aucune policy (= tout refusé pour ces rôles) et on retire
-- leurs privilèges. Le propriétaire des tables (rôle de DATABASE_URL) n'est
-- pas concerné : RLS ne s'applique pas au propriétaire sans FORCE.
--
-- Sur un PostgreSQL ordinaire (sans rôles anon/authenticated), seule
-- l'activation de RLS s'applique : sans effet pour le rôle propriétaire.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "subscription_plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "simulations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admin_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "upgrade_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format(
        'REVOKE ALL ON TABLE users, subscription_plans, subscriptions, simulations, admin_logs, upgrade_requests FROM %I',
        r
      );
      -- Tables créées plus tard dans ce schéma par le même propriétaire.
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I',
        r
      );
    END IF;
  END LOOP;
END
$$;
