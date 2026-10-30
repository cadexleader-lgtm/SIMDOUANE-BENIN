import { Router } from "express";
import { db } from "@workspace/db";
import { subscriptionsTable, subscriptionPlansTable, simulationsTable } from "@workspace/db";
import { eq, and, gte, count, or, isNull, gt } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/userUtils";
import { sendError } from "../lib/httpErrors";

// GET /api/subscription-plans
export const plansRouter = Router();
plansRouter.get("/", async (_req, res) => {
  try {
    const plans = await db
      .select()
      .from(subscriptionPlansTable)
      .where(eq(subscriptionPlansTable.isActive, true));
    res.json(plans.map(mapPlan));
  } catch {
    res.status(500).json({ error: "Internal error" });
  }
});

// GET /api/subscription
export const subscriptionRouter = Router();
subscriptionRouter.get("/", requireAuth, async (req, res) => {
  try {
    const authUserId = (req as AuthedRequest).authUserId;
    const user = await getOrCreateUser(authUserId, req);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const activeCondition = and(
      eq(subscriptionsTable.userId, user.id),
      eq(subscriptionsTable.status, "active"),
      or(isNull(subscriptionsTable.endDate), gt(subscriptionsTable.endDate, now)),
    );

    const [sub, monthlyCount] = await Promise.all([
      db
        .select({
          status: subscriptionsTable.status,
          startDate: subscriptionsTable.startDate,
          endDate: subscriptionsTable.endDate,
          plan: subscriptionPlansTable,
        })
        .from(subscriptionsTable)
        .innerJoin(subscriptionPlansTable, eq(subscriptionsTable.planId, subscriptionPlansTable.id))
        .where(activeCondition)
        .limit(1),
      db
        .select({ count: count() })
        .from(simulationsTable)
        .where(and(eq(simulationsTable.userId, user.id), gte(simulationsTable.createdAt, monthStart))),
    ]);

    const simUsedThisMonth = monthlyCount[0]?.count ?? 0;

    if (!sub.length) {
      const [freePlan] = await db
        .select()
        .from(subscriptionPlansTable)
        .where(eq(subscriptionPlansTable.slug, "gratuit"))
        .limit(1);
      res.json({
        plan: freePlan
          ? mapPlan(freePlan)
          : { id: "free", name: "Gratuit", slug: "gratuit", priceMonthly: 0, simulationsPerMonth: 3, features: ["3 simulations par mois"], isActive: true },
        status: "active",
        startDate: null,
        endDate: null,
        simUsedThisMonth,
      });
      return;
    }

    res.json({
      plan: mapPlan(sub[0].plan),
      status: sub[0].status,
      startDate: sub[0].startDate?.toISOString() ?? null,
      endDate: sub[0].endDate?.toISOString() ?? null,
      simUsedThisMonth,
    });
  } catch (err) {
    sendError(req, res, err);
  }
});

function mapPlan(p: typeof subscriptionPlansTable.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    priceMonthly: Number(p.priceMonthly),
    simulationsPerMonth: p.simulationsPerMonth,
    features: (p.features as string[]) ?? [],
    isActive: p.isActive,
  };
}
