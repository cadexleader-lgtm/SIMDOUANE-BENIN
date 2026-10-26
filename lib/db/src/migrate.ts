/**
 * Applies the versioned SQL migrations in lib/db/migrations to DATABASE_URL.
 * Already applied migrations are recorded in drizzle.__drizzle_migrations
 * and skipped, so the command can be re-run safely.
 */
import "./load-env";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { poolConfigFromEnv } from "./connection";

const migrationsFolder = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../migrations",
);

const pool = new pg.Pool(poolConfigFromEnv());

try {
  await migrate(drizzle(pool), { migrationsFolder });
  console.log("Migrations applied from", migrationsFolder);
} catch (err) {
  console.error("Migration failed:", err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
