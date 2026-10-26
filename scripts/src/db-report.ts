/**
 * Prints, for each application table, the row count and a checksum of the
 * full content. Run it on the source database (Replit) and on the target
 * database (Supabase) after a data transfer: both reports must be identical.
 *
 *   DATABASE_URL=... pnpm --filter @workspace/scripts run db-report
 *
 * Read-only: it only runs SELECT statements.
 */
import "@workspace/db/load-env";
import { pool } from "@workspace/db";

// Child tables after their parents; same order as the restore procedure.
const TABLES = [
  "users",
  "subscription_plans",
  "subscriptions",
  "simulations",
  "upgrade_requests",
  "admin_logs",
  "organizations",
  "stored_files",
  "transitaire_applications",
  "transitaire_access_decisions",
  "audit_logs",
] as const;
// Columns added by later migrations get default values when old data is
// restored, so `users` is compared on its original (Replit) columns only.
const CHECKSUM_COLUMNS: Partial<Record<(typeof TABLES)[number], string[]>> = {
  users: ["id", "clerk_id", "email", "full_name", "phone", "whatsapp", "poste", "onboarded", "status", "created_at", "updated_at"],
};
// Composite-key tables (no `id` column) are compared by row count only.
const COUNT_ONLY = ["organization_members", "transitaire_application_documents"] as const;

async function report() {
  console.log("table".padEnd(34), "rows".padStart(8), " checksum (md5)");
  // The former Replit database only has the first six tables.
  const exists = async (table: string) =>
    (await pool.query<{ ok: boolean }>(`SELECT to_regclass($1) IS NOT NULL AS ok`, [`public.${table}`])).rows[0].ok;

  for (const table of TABLES) {
    if (!(await exists(table))) {
      console.log(table.padEnd(34), "absente".padStart(8));
      continue;
    }
    const columns = CHECKSUM_COLUMNS[table];
    const rowExpr = columns ? `row(${columns.map((c) => `t.${c}`).join(", ")})::text` : "t::text";
    // Ordered by primary key so the checksum does not depend on storage order.
    const { rows } = await pool.query<{ n: string; checksum: string | null }>(
      `SELECT count(*)::text AS n,
              md5(coalesce(string_agg(${rowExpr}, '|' ORDER BY t.id), '')) AS checksum
         FROM ${table} t`,
    );
    console.log(table.padEnd(34), rows[0].n.padStart(8), "", rows[0].checksum);
  }
  for (const table of COUNT_ONLY) {
    if (!(await exists(table))) {
      console.log(table.padEnd(34), "absente".padStart(8));
      continue;
    }
    const { rows } = await pool.query<{ n: string }>(`SELECT count(*)::text AS n FROM ${table}`);
    console.log(table.padEnd(34), rows[0].n.padStart(8), "", "(nombre de lignes uniquement)");
  }
}

report()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
