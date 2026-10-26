import { Router } from "express";
import { db, clearanceCasesTable, vehiclesTable, caseEventsTable, usersTable, type ClearanceCase, type Vehicle } from "@workspace/db";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { requireUser, type AuthedRequest } from "../middlewares/requireAuth";
import { HttpError, sendError } from "../lib/httpErrors";
import { audit } from "../lib/audit";
import { loadCaseForUser } from "../lib/cases/access";
import { caseReference, missingFields, recommendedFields, statusAfterCheck, type CaseState, type CaseStatus } from "../lib/cases/rules";
import { validateCaseInput } from "../lib/cases/validate";

// Vehicle import files of the signed-in owner. Every route goes through
// requireUser (signed in, account active) and loadCaseForUser (owner only).
const router = Router();

/** Generous cap against abuse; raise it if real usage needs more. */
export const MAX_ACTIVE_CASES_PER_USER = 100;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function stateOf(file: ClearanceCase, vehicle: Vehicle): CaseState {
  return {
    arrivalSituation: file.arrivalSituation,
    originCountry: file.originCountry,
    estimatedArrivalDate: file.estimatedArrivalDate,
    arrivalDate: file.arrivalDate,
    transportReference: file.transportReference,
    vehicle: { make: vehicle.make, model: vehicle.model, year: vehicle.year, vin: vehicle.vin },
  };
}

function mapVehicle(v: Vehicle) {
  return { make: v.make, model: v.model ?? null, year: v.year ?? null, vin: v.vin ?? null, condition: v.condition ?? null };
}

function mapCase(file: ClearanceCase, vehicle: Vehicle) {
  const state = stateOf(file, vehicle);
  return {
    id: file.id,
    reference: file.reference,
    arrivalSituation: file.arrivalSituation,
    status: file.status,
    statusChangedAt: file.statusChangedAt.toISOString(),
    vehicle: mapVehicle(vehicle),
    originCountry: file.originCountry ?? null,
    departurePort: file.departurePort ?? null,
    shippedAt: file.shippedAt ?? null,
    estimatedArrivalDate: file.estimatedArrivalDate ?? null,
    arrivalDate: file.arrivalDate ?? null,
    arrivalPort: file.arrivalPort,
    transportReference: file.transportReference ?? null,
    existingReferences: file.existingReferences ?? null,
    formalitiesDone: file.formalitiesDone ?? null,
    knownBlockers: file.knownBlockers ?? null,
    notes: file.notes ?? null,
    missingFields: missingFields(state),
    recommendedFields: recommendedFields(state),
    createdAt: file.createdAt.toISOString(),
    updatedAt: file.updatedAt.toISOString(),
  };
}

function invalid(fieldErrors: Record<string, string>) {
  return new HttpError(400, "VALIDATION_ERROR", "Certaines informations sont à corriger.", { fieldErrors });
}

async function recordEvent(
  tx: Tx,
  e: { caseId: string; actorUserId: string; type: string; fromStatus?: string; toStatus?: string; details?: Record<string, unknown> },
) {
  await tx.insert(caseEventsTable).values({
    caseId: e.caseId,
    actorUserId: e.actorUserId,
    type: e.type,
    fromStatus: e.fromStatus ?? null,
    toStatus: e.toStatus ?? null,
    details: e.details ?? null,
  });
}

// GET /api/cases
router.get("/", requireUser, async (req, res) => {
  try {
    const user = (req as AuthedRequest).currentUser;
    const rows = await db
      .select({ file: clearanceCasesTable, vehicle: vehiclesTable })
      .from(clearanceCasesTable)
      .innerJoin(vehiclesTable, eq(clearanceCasesTable.vehicleId, vehiclesTable.id))
      .where(and(eq(clearanceCasesTable.ownerUserId, user.id), isNull(clearanceCasesTable.deletedAt)))
      .orderBy(desc(clearanceCasesTable.updatedAt));
    res.json(
      rows.map(({ file, vehicle }) => ({
        id: file.id,
        reference: file.reference,
        arrivalSituation: file.arrivalSituation,
        status: file.status,
        vehicle: mapVehicle(vehicle),
        missingCount: missingFields(stateOf(file, vehicle)).length,
        updatedAt: file.updatedAt.toISOString(),
      })),
    );
  } catch (err) {
    sendError(req, res, err);
  }
});

// POST /api/cases
router.post("/", requireUser, async (req, res) => {
  try {
    const user = (req as AuthedRequest).currentUser;
    const result = validateCaseInput(req.body, "create");
    if (!result.ok) throw invalid(result.fieldErrors);
    const { caseChanges, vehicleChanges } = result;

    const [{ active }] = await db
      .select({ active: count() })
      .from(clearanceCasesTable)
      .where(and(eq(clearanceCasesTable.ownerUserId, user.id), isNull(clearanceCasesTable.deletedAt)));
    if (active >= MAX_ACTIVE_CASES_PER_USER) {
      throw new HttpError(409, "TOO_MANY_CASES", `${MAX_ACTIVE_CASES_PER_USER} dossiers actifs au maximum. Archivez ceux qui sont terminés.`);
    }

    const created = await db.transaction(async (tx) => {
      const [vehicle] = await tx
        .insert(vehiclesTable)
        .values({ ownerUserId: user.id, make: vehicleChanges.make!, ...vehicleChanges })
        .returning();
      const { rows } = await tx.execute<{ n: string }>(sql`SELECT nextval('clearance_case_reference_seq')::text AS n`);
      const [file] = await tx
        .insert(clearanceCasesTable)
        .values({
          reference: caseReference(BigInt(rows[0].n)),
          ownerUserId: user.id,
          vehicleId: vehicle.id,
          arrivalSituation: caseChanges.arrivalSituation!,
          ...caseChanges,
        })
        .returning();
      await recordEvent(tx, { caseId: file.id, actorUserId: user.id, type: "created", toStatus: file.status });
      await audit(
        { actorUserId: user.id, actorRole: "user", action: "case.created", targetType: "clearance_case", targetId: file.id },
        tx,
      );
      return { file, vehicle };
    });
    res.status(201).json(mapCase(created.file, created.vehicle));
  } catch (err) {
    sendError(req, res, err);
  }
});

// GET /api/cases/:id
router.get("/:id", requireUser, async (req, res) => {
  try {
    const { file, vehicle } = await loadCaseForUser(String(req.params.id), (req as AuthedRequest).currentUser, "read");
    res.json(mapCase(file, vehicle));
  } catch (err) {
    sendError(req, res, err);
  }
});

// PATCH /api/cases/:id
router.patch("/:id", requireUser, async (req, res) => {
  try {
    const user = (req as AuthedRequest).currentUser;
    const { file, vehicle } = await loadCaseForUser(String(req.params.id), user, "write");
    const result = validateCaseInput(req.body, "update", { ...stateOf(file, vehicle), shippedAt: file.shippedAt });
    if (!result.ok) throw invalid(result.fieldErrors);
    const { caseChanges, vehicleChanges } = result;

    const changed = [
      ...Object.keys(caseChanges).filter((k) => (caseChanges as Record<string, unknown>)[k] !== (file as Record<string, unknown>)[k]),
      ...Object.keys(vehicleChanges)
        .filter((k) => (vehicleChanges as Record<string, unknown>)[k] !== (vehicle as Record<string, unknown>)[k])
        .map((k) => `vehicle.${k}`),
    ];

    const updated = await db.transaction(async (tx) => {
      const now = new Date();
      const [v] = Object.keys(vehicleChanges).length
        ? await tx.update(vehiclesTable).set({ ...vehicleChanges, updatedAt: now }).where(eq(vehiclesTable.id, vehicle.id)).returning()
        : [vehicle];
      const merged = { ...file, ...caseChanges } as ClearanceCase;
      // A draft stays a draft; a checked file is re-evaluated on every change.
      const nextStatus: CaseStatus = file.status === "draft" ? "draft" : statusAfterCheck(stateOf(merged, v));
      const [f] = await tx
        .update(clearanceCasesTable)
        .set({
          ...caseChanges,
          status: nextStatus,
          ...(nextStatus !== file.status ? { statusChangedAt: now } : {}),
          updatedAt: now,
        })
        .where(eq(clearanceCasesTable.id, file.id))
        .returning();
      if (changed.length) {
        await recordEvent(tx, { caseId: file.id, actorUserId: user.id, type: "updated", details: { fields: changed } });
      }
      if (nextStatus !== file.status) {
        await recordEvent(tx, { caseId: file.id, actorUserId: user.id, type: "status_changed", fromStatus: file.status, toStatus: nextStatus });
      }
      return { file: f, vehicle: v };
    });
    res.json(mapCase(updated.file, updated.vehicle));
  } catch (err) {
    sendError(req, res, err);
  }
});

// POST /api/cases/:id/check — completeness check: incomplete or ready.
router.post("/:id/check", requireUser, async (req, res) => {
  try {
    const user = (req as AuthedRequest).currentUser;
    const { file, vehicle } = await loadCaseForUser(String(req.params.id), user, "write");
    const nextStatus = statusAfterCheck(stateOf(file, vehicle));
    if (nextStatus === file.status) {
      res.json(mapCase(file, vehicle));
      return;
    }
    const updated = await db.transaction(async (tx) => {
      const now = new Date();
      const [f] = await tx
        .update(clearanceCasesTable)
        .set({ status: nextStatus, statusChangedAt: now, updatedAt: now })
        .where(eq(clearanceCasesTable.id, file.id))
        .returning();
      await recordEvent(tx, { caseId: file.id, actorUserId: user.id, type: "status_changed", fromStatus: file.status, toStatus: nextStatus });
      return f;
    });
    res.json(mapCase(updated, vehicle));
  } catch (err) {
    sendError(req, res, err);
  }
});

// DELETE /api/cases/:id — archive (hidden, kept).
router.delete("/:id", requireUser, async (req, res) => {
  try {
    const user = (req as AuthedRequest).currentUser;
    const { file } = await loadCaseForUser(String(req.params.id), user, "write");
    await db.transaction(async (tx) => {
      const now = new Date();
      await tx.update(clearanceCasesTable).set({ deletedAt: now, updatedAt: now }).where(eq(clearanceCasesTable.id, file.id));
      await recordEvent(tx, { caseId: file.id, actorUserId: user.id, type: "archived" });
      await audit(
        { actorUserId: user.id, actorRole: "user", action: "case.archived", targetType: "clearance_case", targetId: file.id },
        tx,
      );
    });
    res.status(204).send();
  } catch (err) {
    sendError(req, res, err);
  }
});

// GET /api/cases/:id/events
router.get("/:id/events", requireUser, async (req, res) => {
  try {
    const { file } = await loadCaseForUser(String(req.params.id), (req as AuthedRequest).currentUser, "read");
    const rows = await db
      .select({ e: caseEventsTable, actorName: usersTable.fullName })
      .from(caseEventsTable)
      .leftJoin(usersTable, eq(caseEventsTable.actorUserId, usersTable.id))
      .where(eq(caseEventsTable.caseId, file.id))
      .orderBy(desc(caseEventsTable.createdAt));
    res.json(
      rows.map(({ e, actorName }) => ({
        id: e.id,
        type: e.type,
        fromStatus: e.fromStatus ?? null,
        toStatus: e.toStatus ?? null,
        sourceCategory: e.sourceCategory,
        actorName: actorName ?? null,
        details: (e.details as Record<string, unknown> | null) ?? null,
        createdAt: e.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    sendError(req, res, err);
  }
});

export default router;
