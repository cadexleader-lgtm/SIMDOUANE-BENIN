import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

/**
 * Public self-check of the deployment: says only whether each part is set up,
 * never a value. Shows at a glance why signed-in features fail (for instance
 * the Supabase service key missing from the server settings).
 */
router.get("/health/config", async (_req, res) => {
  let database = false;
  try {
    await db.execute(sql`select 1`);
    database = true;
  } catch {
    database = false;
  }
  const accounts = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  res.set("Cache-Control", "no-store").status(database && accounts ? 200 : 503).json({
    database: database ? "ok" : "injoignable",
    accounts: accounts ? "ok" : "SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_URL manquant sur le serveur",
  });
});

export default router;
