import { readFileSync } from "node:fs";
import type { PoolConfig } from "pg";

/**
 * Builds the pg connection options from the environment.
 *
 * - DATABASE_URL: required. Any PostgreSQL (local, Supabase, other host).
 * - DATABASE_SSL_CA_FILE: optional path to the server CA certificate (for
 *   Supabase: "Database Settings > SSL Configuration > Download certificate").
 *   When set, TLS is required and the server certificate is verified.
 *   Do not also put `sslmode=` in DATABASE_URL: pg lets the URL override this.
 */
export function poolConfigFromEnv(): PoolConfig {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  const caFile = process.env.DATABASE_SSL_CA_FILE;
  return {
    connectionString,
    ...(caFile
      ? { ssl: { ca: readFileSync(caFile, "utf8"), rejectUnauthorized: true } }
      : {}),
  };
}
