import { Router } from "express";
import { db } from "@workspace/db";
import { simulationsTable, usersTable, subscriptionsTable, subscriptionPlansTable } from "@workspace/db";
import { eq, and, desc, gte, lte, ilike, or, sql, count, SQL, or as drizzleOr, isNull, gt } from "drizzle-orm";
import { calculate } from "@workspace/sim-engine";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/userUtils";
import { sendError } from "../lib/httpErrors";
import { parseSimulationInput } from "../lib/simulationInput";

const router = Router();

// GET /api/simulations
router.get("/", requireAuth, async (req, res) => {
  try {
    const authUserId = (req as AuthedRequest).authUserId;
    const user = await getOrCreateUser(authUserId, req);

    const { search, dateFrom, dateTo, limit = "50", offset = "0" } = req.query as Record<string, string>;

    const conditions: SQL[] = [eq(simulationsTable.userId, user.id)];

    if (search) {
      const s = String(search);
      const orCond = or(ilike(simulationsTable.marque, `%${s}%`), ilike(simulationsTable.modele, `%${s}%`));
      if (orCond) conditions.push(orCond);
    }
    if (dateFrom) conditions.push(gte(simulationsTable.createdAt, new Date(String(dateFrom))));
    if (dateTo) conditions.push(lte(simulationsTable.createdAt, new Date(String(dateTo) + "T23:59:59")));

    const [rows, totalRows] = await Promise.all([
      db
        .select()
        .from(simulationsTable)
        .where(and(...conditions))
        .orderBy(desc(simulationsTable.createdAt))
        .limit(Number(limit))
        .offset(Number(offset)),
      db
        .select({ count: count() })
        .from(simulationsTable)
        .where(and(...conditions)),
    ]);

    res.json({ simulations: rows.map(mapSim), total: totalRows[0]?.count ?? 0 });
  } catch (err) {
    sendError(req, res, err);
  }
});

// POST /api/simulations
router.post("/", requireAuth, async (req, res) => {
  try {
    const authUserId = (req as AuthedRequest).authUserId;
    const user = await getOrCreateUser(authUserId, req);

    // Invalid input → 400 INVALID_SIMULATION (French message per field).
    const input = parseSimulationInput(req.body);

    // Check monthly simulation limit
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const activeSubscription = and(
      eq(subscriptionsTable.userId, user.id),
      eq(subscriptionsTable.status, "active"),
      drizzleOr(isNull(subscriptionsTable.endDate), gt(subscriptionsTable.endDate, now)),
    );

    const [simCount, userSub] = await Promise.all([
      db
        .select({ count: count() })
        .from(simulationsTable)
        .where(and(eq(simulationsTable.userId, user.id), gte(simulationsTable.createdAt, monthStart))),
      db
        .select({ simulationsPerMonth: subscriptionPlansTable.simulationsPerMonth })
        .from(subscriptionsTable)
        .innerJoin(subscriptionPlansTable, eq(subscriptionsTable.planId, subscriptionPlansTable.id))
        .where(activeSubscription)
        .limit(1),
    ]);

    const monthlyLimit = userSub[0]?.simulationsPerMonth ?? 3; // default free: 3/month
    const used = simCount[0]?.count ?? 0;

    if (monthlyLimit !== null && used >= monthlyLimit) {
      res.status(403).json({
        error: "QUOTA_EXCEEDED",
        used,
        limit: monthlyLimit,
        message: "Simulation limit reached for this month",
      });
      return;
    }

    // The totals are never taken from the client: recomputed with the same
    // engine as the web app (lib/sim-engine).
    const result = calculate({
      marque:      input.marque,
      modele:      input.modele,
      annee:       input.annee,
      cylindree:   input.cylindree,
      carburant:   input.carburant,
      valeurCIF:   input.valeurCIF,
      joursAuPort: input.joursAuPort,
      regime:      input.regime,
    });
    const totals = (["totalDouane", "totalPort", "totalGeneral"] as const).map((key) => ({
      key,
      client: input[key],
      server: result[key],
    }));
    if (totals.some((t) => !(Math.abs(t.client - t.server) <= 1))) {
      req.log.warn(
        { userId: user.id, totals },
        "simulation totals sent by the client differ from the server calculation; server totals stored",
      );
    }

    const [sim] = await db
      .insert(simulationsTable)
      .values({
        userId:       user.id,
        marque:       input.marque,
        modele:       input.modele,
        annee:        input.annee,
        cylindree:    input.cylindree,
        carburant:    input.carburant,
        valeurCIF:    String(input.valeurCIF),
        joursAuPort:  input.joursAuPort,
        regime:       input.regime,
        totalDouane:  String(result.totalDouane),
        totalPort:    String(result.totalPort),
        totalGeneral: String(result.totalGeneral),
        condition: input.condition ?? "Occasion",
        powertrain: input.powertrain ?? null,
        referenceDate: input.referenceDate ?? null,
        regulatoryYear: input.regulatoryYear ?? null,
        calculatorVersion: input.calculatorVersion ?? "historical",
        regulatoryConfigVersion: input.regulatoryConfigVersion ?? null,
        details: input.details ?? null,
      })
      .returning();

    res.status(201).json(mapSim(sim));
  } catch (err) {
    sendError(req, res, err);
  }
});

// GET /api/simulations/stats
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const authUserId = (req as AuthedRequest).authUserId;
    const user = await getOrCreateUser(authUserId, req);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, monthly, avg, userSub] = await Promise.all([
      db.select({ count: count() }).from(simulationsTable).where(eq(simulationsTable.userId, user.id)),
      db.select({ count: count() }).from(simulationsTable).where(and(eq(simulationsTable.userId, user.id), gte(simulationsTable.createdAt, monthStart))),
      db.select({ avg: sql<string>`AVG(${simulationsTable.totalGeneral})` }).from(simulationsTable).where(eq(simulationsTable.userId, user.id)),
      db
        .select({ simulationsPerMonth: subscriptionPlansTable.simulationsPerMonth })
        .from(subscriptionsTable)
        .innerJoin(subscriptionPlansTable, eq(subscriptionsTable.planId, subscriptionPlansTable.id))
        .where(and(eq(subscriptionsTable.userId, user.id), eq(subscriptionsTable.status, "active")))
        .limit(1),
    ]);

    const monthlyLimit = userSub[0]?.simulationsPerMonth ?? 3;
    res.json({
      totalSimulations: total[0]?.count ?? 0,
      thisMonthSimulations: monthly[0]?.count ?? 0,
      avgTotal: Math.round(Number(avg[0]?.avg ?? 0)),
      monthlyLimit,
      simUsedThisMonth: monthly[0]?.count ?? 0,
    });
  } catch (err) {
    sendError(req, res, err);
  }
});

// DELETE /api/simulations/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const authUserId = (req as AuthedRequest).authUserId;
    const user = await getOrCreateUser(authUserId, req);

    const simId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const deleted = await db
      .delete(simulationsTable)
      .where(and(eq(simulationsTable.id, simId), eq(simulationsTable.userId, user.id)))
      .returning();

    if (!deleted.length) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    sendError(req, res, err);
  }
});

function mapSim(s: typeof simulationsTable.$inferSelect) {
  return {
    id:           s.id,
    userId:       s.userId,
    marque:       s.marque,
    modele:       s.modele,
    annee:        s.annee,
    cylindree:    s.cylindree,
    carburant:    s.carburant,
    valeurCIF:    Number(s.valeurCIF),
    joursAuPort:  s.joursAuPort,
    regime:       s.regime,
    totalDouane:  Number(s.totalDouane),
    totalPort:    Number(s.totalPort),
    totalGeneral: Number(s.totalGeneral),
    condition: s.condition,
    powertrain: s.powertrain,
    referenceDate: s.referenceDate,
    regulatoryYear: s.regulatoryYear,
    calculatorVersion: s.calculatorVersion,
    regulatoryConfigVersion: s.regulatoryConfigVersion,
    details:      s.details ?? null,
    createdAt:    s.createdAt.toISOString(),
  };
}

export default router;
