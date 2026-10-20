import { Router, type Request } from "express";
import { db } from "@workspace/db";
import { usersTable, subscriptionsTable, subscriptionPlansTable, simulationsTable, adminLogsTable, upgradeRequestsTable } from "@workspace/db";
import { eq, and, desc, ilike, or, count, gte, SQL } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAuth";
import { getAuth } from "@clerk/express";

function param(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0] : v;
}

const router = Router();

// GET /api/admin/dashboard
router.get("/dashboard", requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [totalUsers, activeSubscribers, totalSimulations, newUsersThisMonth] = await Promise.all([
      db.select({ count: count() }).from(usersTable),
      db.select({ count: count() }).from(subscriptionsTable).where(eq(subscriptionsTable.status, "active")),
      db.select({ count: count() }).from(simulationsTable),
      db.select({ count: count() }).from(usersTable).where(gte(usersTable.createdAt, monthStart)),
    ]);

    res.json({
      totalUsers: totalUsers[0]?.count ?? 0,
      activeSubscribers: activeSubscribers[0]?.count ?? 0,
      totalSimulations: totalSimulations[0]?.count ?? 0,
      newUsersThisMonth: newUsersThisMonth[0]?.count ?? 0,
      revenueThisMonth: 0,  // will connect to payment gateway later
      revenueThisYear: 0,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

// GET /api/admin/users
router.get("/users", requireAdmin, async (req, res) => {
  try {
    const { search, limit = "50", offset = "0" } = req.query as Record<string, string>;

    const conditions: SQL[] = [];
    if (search) {
      const s = String(search);
      const orCond = or(ilike(usersTable.email, `%${s}%`), ilike(usersTable.fullName, `%${s}%`));
      if (orCond) conditions.push(orCond);
    }
    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [users, totalRows] = await Promise.all([
      db
        .select({
          user: usersTable,
          planName: subscriptionPlansTable.name,
        })
        .from(usersTable)
        .leftJoin(
          subscriptionsTable,
          and(eq(subscriptionsTable.userId, usersTable.id), eq(subscriptionsTable.status, "active")),
        )
        .leftJoin(subscriptionPlansTable, eq(subscriptionsTable.planId, subscriptionPlansTable.id))
        .where(whereClause)
        .orderBy(desc(usersTable.createdAt))
        .limit(Number(limit))
        .offset(Number(offset)),
      db
        .select({ count: count() })
        .from(usersTable)
        .where(whereClause),
    ]);

    res.json({
      users: users.map((r) => ({
        id: r.user.id,
        clerkId: r.user.clerkId,
        email: r.user.email,
        fullName: r.user.fullName,
        phone: r.user.phone ?? null,
        status: r.user.status,
        planName: r.planName ?? "Gratuit",
        createdAt: r.user.createdAt.toISOString(),
      })),
      total: totalRows[0]?.count ?? 0,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

// PUT /api/admin/users/:id/status
router.put("/users/:id/status", requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const auth = getAuth(req);
    const userId = param(req, "id");

    await db.update(usersTable).set({ status, updatedAt: new Date() }).where(eq(usersTable.id, userId));

    await db.insert(adminLogsTable).values({
      adminClerkId: auth.userId!,
      action: "update_user_status",
      targetId: userId,
      targetType: "user",
      details: { status } as any,
    });

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

// GET /api/admin/simulations
router.get("/simulations", requireAdmin, async (req, res) => {
  try {
    const { search, userId, dateFrom, dateTo, limit = "50", offset = "0" } = req.query as Record<string, string>;

    const conditions: SQL[] = [];
    if (userId) conditions.push(eq(simulationsTable.userId, String(userId)));
    if (search) {
      const s = String(search);
      const orCond = or(ilike(simulationsTable.marque, `%${s}%`), ilike(simulationsTable.modele, `%${s}%`));
      if (orCond) conditions.push(orCond);
    }
    if (dateFrom) conditions.push(gte(simulationsTable.createdAt, new Date(String(dateFrom))));
    const whereClause2 = conditions.length ? and(...conditions) : undefined;

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          sim: simulationsTable,
          email: usersTable.email,
          fullName: usersTable.fullName,
        })
        .from(simulationsTable)
        .innerJoin(usersTable, eq(simulationsTable.userId, usersTable.id))
        .where(whereClause2)
        .orderBy(desc(simulationsTable.createdAt))
        .limit(Number(limit))
        .offset(Number(offset)),
      db
        .select({ count: count() })
        .from(simulationsTable)
        .where(whereClause2),
    ]);

    res.json({
      simulations: rows.map((r) => ({
        id: r.sim.id,
        userId: r.sim.userId,
        marque: r.sim.marque,
        modele: r.sim.modele,
        annee: r.sim.annee,
        cylindree: r.sim.cylindree,
        carburant: r.sim.carburant,
        valeurCIF: Number(r.sim.valeurCIF),
        joursAuPort: r.sim.joursAuPort,
        regime: r.sim.regime,
        totalDouane: Number(r.sim.totalDouane),
        totalPort: Number(r.sim.totalPort),
        totalGeneral: Number(r.sim.totalGeneral),
        createdAt: r.sim.createdAt.toISOString(),
        userEmail: r.email,
        userFullName: r.fullName,
      })),
      total: totalRows[0]?.count ?? 0,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

// GET /api/admin/subscription-plans
router.get("/subscription-plans", requireAdmin, async (_req, res) => {
  try {
    const plans = await db.select().from(subscriptionPlansTable);
    res.json(plans.map(mapPlan));
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});

// POST /api/admin/users/:id/assign-subscription
router.post("/users/:id/assign-subscription", requireAdmin, async (req, res) => {
  try {
    const auth = getAuth(req);
    const userId = param(req, "id");
    const { planId, durationMonths, requestId } = req.body as {
      planId: string;
      durationMonths?: number;
      requestId?: string;
    };

    if (!planId) {
      res.status(400).json({ error: "planId is required" });
      return;
    }

    const [plan] = await db
      .select()
      .from(subscriptionPlansTable)
      .where(eq(subscriptionPlansTable.id, planId))
      .limit(1);

    if (!plan) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }

    const startDate = new Date();
    const endDate = durationMonths
      ? new Date(startDate.getTime() + durationMonths * 30 * 24 * 60 * 60 * 1000)
      : null;

    const newSub = await db.transaction(async (tx) => {
      if (requestId) {
        const [request] = await tx
          .select({ userId: upgradeRequestsTable.userId })
          .from(upgradeRequestsTable)
          .where(eq(upgradeRequestsTable.id, requestId))
          .limit(1);
        if (!request || request.userId !== userId) {
          throw Object.assign(new Error("Upgrade request does not belong to this user"), { statusCode: 400 });
        }
      }

      await tx
        .update(subscriptionsTable)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(and(eq(subscriptionsTable.userId, userId), eq(subscriptionsTable.status, "active")));

      const [subscription] = await tx
        .insert(subscriptionsTable)
        .values({ userId, planId, status: "active", startDate, ...(endDate ? { endDate } : {}) })
        .returning();

      if (requestId) {
        await tx
          .update(upgradeRequestsTable)
          .set({
            status: "activated",
            processedAt: new Date(),
            processedBy: auth.userId ?? null,
            processedNote: "Paiement vérifié et plan activé manuellement.",
          })
          .where(eq(upgradeRequestsTable.id, requestId));
      }

      await tx.insert(adminLogsTable).values({
        adminClerkId: auth.userId!,
        action: requestId ? "activate_subscription_from_request" : "assign_subscription",
        targetId: userId,
        targetType: "user",
        details: { planId, planName: plan.name, durationMonths: durationMonths ?? null, requestId: requestId ?? null } as any,
      });

      return subscription;
    });

    res.json({ ok: true, subscription: newSub });
  } catch (err: any) {
    req.log.error(err);
    res.status(err?.statusCode ?? 500).json({ error: err?.statusCode ? err.message : "Internal error" });
  }
});

// DELETE /api/admin/users/:id/subscription (revoke)
router.delete("/users/:id/subscription", requireAdmin, async (req, res) => {
  try {
    const auth = getAuth(req);
    const userId = param(req, "id");

    await db
      .update(subscriptionsTable)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(subscriptionsTable.userId, userId), eq(subscriptionsTable.status, "active")));

    await db.insert(adminLogsTable).values({
      adminClerkId: auth.userId!,
      action: "revoke_subscription",
      targetId: userId,
      targetType: "user",
      details: {} as any,
    });

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

// POST /api/admin/subscription-plans
router.post("/subscription-plans", requireAdmin, async (req, res) => {
  try {
    const { name, slug, priceMonthly, simulationsPerMonth, features } = req.body;
    const [plan] = await db
      .insert(subscriptionPlansTable)
      .values({
        name,
        slug,
        priceMonthly: String(priceMonthly),
        simulationsPerMonth: simulationsPerMonth ?? null,
        features: (features ?? []) as any,
      })
      .returning();
    res.status(201).json(mapPlan(plan));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

// PUT /api/admin/subscription-plans/:id
router.put("/subscription-plans/:id", requireAdmin, async (req, res) => {
  try {
    const { name, priceMonthly, simulationsPerMonth, features, isActive } = req.body;
    const planId = param(req, "id");
    const [plan] = await db
      .update(subscriptionPlansTable)
      .set({
        ...(name !== undefined ? { name } : {}),
        ...(priceMonthly !== undefined ? { priceMonthly: String(priceMonthly) } : {}),
        ...(simulationsPerMonth !== undefined ? { simulationsPerMonth } : {}),
        ...(features !== undefined ? { features: features as any } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        updatedAt: new Date(),
      })
      .where(eq(subscriptionPlansTable.id, planId))
      .returning();
    res.json(mapPlan(plan));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal error" });
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

// GET /api/admin/upgrade-requests
router.get("/upgrade-requests", requireAdmin, async (_req, res) => {
  try {
    const requests = await db
      .select()
      .from(upgradeRequestsTable)
      .orderBy(desc(upgradeRequestsTable.createdAt));
    res.json(requests.map((r) => ({
      id:           r.id,
      userId:       r.userId,
      userEmail:    r.userEmail,
      userFullName: r.userFullName,
      planWanted:   r.planWanted,
      durationMonths: r.durationMonths,
      mobileMoneyPhone: r.mobileMoneyPhone,
      mobileMoneyOperator: r.mobileMoneyOperator,
      transactionReference: r.transactionReference,
      declaredAmount: r.declaredAmount ? Number(r.declaredAmount) : null,
      receiptUrl: r.receiptUrl,
      message:      r.message,
      status:       r.status,
      createdAt:    r.createdAt.toISOString(),
      processedAt:  r.processedAt?.toISOString() ?? null,
      processedBy: r.processedBy,
      processedNote: r.processedNote,
      rejectionReason: r.rejectionReason,
    })));
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});

// PUT /api/admin/upgrade-requests/:id/process
router.put("/upgrade-requests/:id/process", requireAdmin, async (req, res) => {
  try {
    const auth = getAuth(req);
    const reqId = param(req, "id");
    const { status, note } = req.body as {
      status: "payment_under_review" | "approved" | "rejected" | "cancelled" | "processed" | "dismissed";
      note?: string;
    };

    await db
      .update(upgradeRequestsTable)
      .set({
        status,
        processedAt: ["rejected", "cancelled", "processed", "dismissed"].includes(status) ? new Date() : null,
        processedBy: auth.userId ?? null,
        ...(status === "rejected" ? { rejectionReason: note ?? null } : { processedNote: note ?? null }),
      })
      .where(eq(upgradeRequestsTable.id, reqId));

    await db.insert(adminLogsTable).values({
      adminClerkId: auth.userId!,
      action: `upgrade_request_${status}`,
      targetId: reqId,
      targetType: "upgrade_request",
      details: {} as any,
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;
