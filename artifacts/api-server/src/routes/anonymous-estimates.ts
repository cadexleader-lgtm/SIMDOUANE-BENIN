import { Router, type IRouter } from "express";
import { and, eq, lt, sql } from "drizzle-orm";
import { db, anonymousDevicesTable } from "@workspace/db";
import { HttpError, sendError } from "../lib/httpErrors";

/** Free estimates for a visitor without an account; then an account is required. */
export const ANONYMOUS_FREE_ESTIMATES = 2;

const DEVICE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function deviceIdFrom(value: unknown): string {
  if (typeof value !== "string" || !DEVICE_ID.test(value)) {
    throw new HttpError(400, "INVALID_DEVICE", "Identifiant d'appareil invalide.");
  }
  return value.toLowerCase();
}

const status = (used: number) => ({
  used,
  limit: ANONYMOUS_FREE_ESTIMATES,
  remaining: Math.max(0, ANONYMOUS_FREE_ESTIMATES - used),
});

const router: IRouter = Router();

/** Public: how many free estimates this browser has used. */
router.get("/:deviceId", async (req, res) => {
  try {
    const deviceId = deviceIdFrom(req.params.deviceId);
    const [row] = await db
      .select({ used: anonymousDevicesTable.estimatesCount })
      .from(anonymousDevicesTable)
      .where(eq(anonymousDevicesTable.deviceId, deviceId));
    res.set("Cache-Control", "no-store").json(status(row?.used ?? 0));
  } catch (err) {
    sendError(req, res, err);
  }
});

/**
 * Public: uses one free estimate. 403 ANONYMOUS_LIMIT once the limit is
 * reached. The counter never decreases: the way forward is a free account.
 */
router.post("/", async (req, res) => {
  try {
    const deviceId = deviceIdFrom(req.body?.deviceId);
    await db.insert(anonymousDevicesTable).values({ deviceId }).onConflictDoNothing();
    // One statement: two requests at the same time cannot both pass the limit.
    const [row] = await db
      .update(anonymousDevicesTable)
      .set({ estimatesCount: sql`${anonymousDevicesTable.estimatesCount} + 1`, lastSeenAt: new Date() })
      .where(and(
        eq(anonymousDevicesTable.deviceId, deviceId),
        lt(anonymousDevicesTable.estimatesCount, ANONYMOUS_FREE_ESTIMATES),
      ))
      .returning({ used: anonymousDevicesTable.estimatesCount });
    res.set("Cache-Control", "no-store");
    if (!row) {
      res.status(403).json({
        error: "ANONYMOUS_LIMIT",
        message: "Vous avez utilisé vos estimations gratuites. Créez un compte gratuit pour continuer.",
        ...status(ANONYMOUS_FREE_ESTIMATES),
      });
      return;
    }
    res.json(status(row.used));
  } catch (err) {
    sendError(req, res, err);
  }
});

export default router;
