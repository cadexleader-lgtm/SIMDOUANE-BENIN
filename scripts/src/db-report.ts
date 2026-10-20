/**
 * Prints, for each application table, the row count and a checksum of the
 * full content. Run it on the source database (Replit) and on the target
 * database (Supabase) after a data transfer: both reports must be identical.
 *
 *   DATABASE_URL=... pnpm --filter @workspace/scripts run db-report
 *
 * Read-only: it only runs SELECT statements.
 */
import { pool } from "@workspace/db";

// Child tables after their parents; same order as the restore procedure.
const TABLES = [
  "users",
  "subscription_plans",
  "subscriptions",
  "simulations",
  "upgrade_requests",
  "admin_logs",
] as const;

async function report() {
  console.log("table".padEnd(20), "rows".padStart(8), " checksum (md5)");
  for (const table of TABLES) {
    // Ordered by primary key so the checksum does not depend on storage order.
    const { rows } = await pool.query<{ n: string; checksum: string | null }>(
      `SELECT count(*)::text AS n,
              md5(coalesce(string_agg(t::text, '|' ORDER BY t.id), '')) AS checksum
         FROM ${table} t`,
    );
    console.log(table.padEnd(20), rows[0].n.padStart(8), "", rows[0].checksum);
  }
}

report()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
