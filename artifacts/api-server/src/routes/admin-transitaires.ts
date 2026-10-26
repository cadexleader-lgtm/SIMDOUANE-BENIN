import { Router } from "express";
import {
  db,
  usersTable,
  transitaireApplicationsTable,
  transitaireAccessDecisionsTable,
  auditLogsTable,
} from "@workspace/db";
import { and, desc, eq, inArray, type SQL } from "drizzle-orm";
import {
  ChangeTransitaireStatusBody,
  DecideTransitaireApplicationBody,
  ListAdminTransitaireApplicationsQueryParams,
} from "@workspace/api-zod";
import { requireAdmin, type AuthedRequest } from "../middlewares/requireAuth";
import { HttpError, sendError } from "../lib/httpErrors";
import { audit } from "../lib/audit";
import { createDownloadLink, DOWNLOAD_LINK_SECONDS } from "../lib/files/storedFiles";
import {
  decisionsFor,
  documentsOf,
  findApplicationDocument,
  loadApplication,
  mapApplicant,
  mapApplication,
  mapTransitaireUser,
} from "../lib/transitaireAccess";

// Mounted under /api/admin. Every route requires an administrator.
const router = Router();

async function loadUser(id: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  return user ?? null;
}

async function applicationDetail(applicationId: string) {
  const application = await loadApplication(applicationId);
  if (!application) throw new HttpError(404, "NOT_FOUND", "Demande introuvable.");
  const user = await loadUser(application.userId);
  if (!user) throw new HttpError(404, "NOT_FOUND", "Compte introuvable.");
  const docs = (await documentsOf([application.id])).get(application.id) ?? [];
  return {
    application: mapApplication(application, docs),
    user: mapApplicant(user),
    decisions: await decisionsFor(user.id),
  };
}

// GET /api/admin/transitaire-applications?status=
router.get("/transitaire-applications", requireAdmin, async (req, res) => {
  try {
    const parsed = ListAdminTransitaireApplicationsQueryParams.safeParse(req.query);
    const status = parsed.success ? (parsed.data.status ?? "submitted") : "submitted";
    const where: SQL | undefined = status === "all" ? undefined : eq(transitaireApplicationsTable.status, status);
    const rows = await db
      .select({ a: transitaireApplicationsTable, u: usersTable })
      .from(transitaireApplicationsTable)
      .innerJoin(usersTable, eq(transitaireApplicationsTable.userId, usersTable.id))
      .where(where)
      .orderBy(desc(transitaireApplicationsTable.createdAt))
      .limit(200);
    const docs = await documentsOf(rows.map((r) => r.a.id));
    res.json(
      rows.map(({ a, u }) => ({
        id: a.id,
        agrementNumber: a.agrementNumber,
        status: a.status,
        createdAt: a.createdAt.toISOString(),
        decidedAt: a.decidedAt?.toISOString() ?? null,
        documentsCount: docs.get(a.id)?.length ?? 0,
        user: mapApplicant(u),
      })),
    );
  } catch (err) {
    sendError(req, res, err);
  }
});

// GET /api/admin/transitaire-applications/:id
router.get("/transitaire-applications/:id", requireAdmin, async (req, res) => {
  try {
    res.json(await applicationDetail(String(req.params.id)));
  } catch (err) {
    sendError(req, res, err);
  }
});

// POST /api/admin/transitaire-applications/:id/documents/:fileId/download-link
// The only access an administrator has to private files in the MVP; logged.
router.post("/transitaire-applications/:id/documents/:fileId/download-link", requireAdmin, async (req, res) => {
  try {
    const admin = (req as AuthedRequest).currentUser;
    const application = await loadApplication(String(req.params.id));
    if (!application) throw new HttpError(404, "NOT_FOUND", "Demande introuvable.");
    const file = await findApplicationDocument(application.id, String(req.params.fileId));
    const url = await createDownloadLink(file);
    await audit({
      actorUserId: admin.id,
      actorRole: "admin",
      action: "file.download_link_issued",
      targetType: "stored_file",
      targetId: file.id,
      details: { purpose: file.purpose, applicationId: application.id, applicantUserId: application.userId },
    });
    res.json({ url, expiresInSeconds: DOWNLOAD_LINK_SECONDS });
  } catch (err) {
    sendError(req, res, err);
  }
});

// POST /api/admin/transitaire-applications/:id/decision
router.post("/transitaire-applications/:id/decision", requireAdmin, async (req, res) => {
  try {
    const admin = (req as AuthedRequest).currentUser;
    const parsed = DecideTransitaireApplicationBody.safeParse(req.body ?? {});
    if (!parsed.success) throw new HttpError(400, "INVALID_INPUT", "Décision invalide.");
    const reason = parsed.data.reason?.trim() || null;

    const application = await loadApplication(String(req.params.id));
    if (!application) throw new HttpError(404, "NOT_FOUND", "Demande introuvable.");
    if (application.userId === admin.id) {
      throw new HttpError(403, "SELF_DECISION_FORBIDDEN", "Un administrateur ne peut pas décider de sa propre demande.");
    }
    if (application.status !== "submitted") throw new HttpError(409, "ALREADY_DECIDED", "Cette demande a déjà été traitée.");

    const approve = parsed.data.decision === "approve";
    if (approve) {
      const docs = (await documentsOf([application.id])).get(application.id) ?? [];
      // A declared number alone is not proof of agrément.
      if (!docs.length) {
        throw new HttpError(422, "JUSTIFICATIF_REQUIRED", "Au moins un justificatif est nécessaire pour approuver.");
      }
    }

    const now = new Date();
    await db.transaction(async (tx) => {
      const updated = await tx
        .update(transitaireApplicationsTable)
        .set({ status: approve ? "approved" : "rejected", decidedAt: now, decidedByUserId: admin.id, decisionReason: reason })
        .where(and(eq(transitaireApplicationsTable.id, application.id), eq(transitaireApplicationsTable.status, "submitted")))
        .returning({ id: transitaireApplicationsTable.id });
      if (!updated.length) throw new HttpError(409, "ALREADY_DECIDED", "Cette demande a déjà été traitée.");
      await tx
        .update(usersTable)
        .set({ transitaireStatus: approve ? "active" : "none", transitaireStatusChangedAt: now, updatedAt: now })
        .where(eq(usersTable.id, application.userId));
      await tx.insert(transitaireAccessDecisionsTable).values({
        userId: application.userId,
        applicationId: application.id,
        decision: approve ? "approved" : "rejected",
        reason,
        decidedByUserId: admin.id,
      });
      await audit(
        {
          actorUserId: admin.id,
          actorRole: "admin",
          action: approve ? "transitaire.approved" : "transitaire.rejected",
          targetType: "user",
          targetId: application.userId,
          details: { applicationId: application.id, reason },
        },
        tx,
      );
    });
    res.json(await applicationDetail(application.id));
  } catch (err) {
    sendError(req, res, err);
  }
});

// GET /api/admin/transitaires
router.get("/transitaires", requireAdmin, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(usersTable)
      .where(inArray(usersTable.transitaireStatus, ["active", "suspended", "revoked"]))
      .orderBy(desc(usersTable.transitaireStatusChangedAt))
      .limit(500);
    res.json(rows.map(mapTransitaireUser));
  } catch (err) {
    sendError(req, res, err);
  }
});

// Allowed transitions for suspend / reinstate / revoke.
const TRANSITIONS = {
  suspend:   { from: ["active"], to: "suspended", decision: "suspended", reasonRequired: true },
  reinstate: { from: ["suspended"], to: "active", decision: "reinstated", reasonRequired: false },
  revoke:    { from: ["active", "suspended"], to: "revoked", decision: "revoked", reasonRequired: true },
} as const;

// POST /api/admin/users/:id/transitaire-status
router.post("/users/:id/transitaire-status", requireAdmin, async (req, res) => {
  try {
    const admin = (req as AuthedRequest).currentUser;
    const parsed = ChangeTransitaireStatusBody.safeParse(req.body ?? {});
    if (!parsed.success) throw new HttpError(400, "INVALID_INPUT", "Action invalide.");
    const rule = TRANSITIONS[parsed.data.action];
    const reason = parsed.data.reason?.trim() || null;
    if (rule.reasonRequired && !reason) throw new HttpError(400, "REASON_REQUIRED", "Un motif est obligatoire.");

    const target = await loadUser(String(req.params.id));
    if (!target) throw new HttpError(404, "NOT_FOUND", "Compte introuvable.");
    if (target.id === admin.id) {
      throw new HttpError(403, "SELF_DECISION_FORBIDDEN", "Un administrateur ne peut pas modifier ses propres droits.");
    }

    const now = new Date();
    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(usersTable)
        .set({ transitaireStatus: rule.to, transitaireStatusChangedAt: now, updatedAt: now })
        .where(and(eq(usersTable.id, target.id), inArray(usersTable.transitaireStatus, [...rule.from])))
        .returning();
      if (!row) {
        throw new HttpError(409, "TRANSITION_NOT_ALLOWED", `Action impossible depuis le statut « ${target.transitaireStatus} ».`);
      }
      await tx.insert(transitaireAccessDecisionsTable).values({
        userId: target.id,
        decision: rule.decision,
        reason,
        decidedByUserId: admin.id,
      });
      await audit(
        {
          actorUserId: admin.id,
          actorRole: "admin",
          action: `transitaire.${rule.decision}`,
          targetType: "user",
          targetId: target.id,
          details: { from: target.transitaireStatus, to: rule.to, reason },
        },
        tx,
      );
      return row;
    });
    res.json(mapTransitaireUser(updated));
  } catch (err) {
    sendError(req, res, err);
  }
});

// GET /api/admin/audit-logs?targetType=&targetId=&limit=
router.get("/audit-logs", requireAdmin, async (req, res) => {
  try {
    const { targetType, targetId } = req.query as Record<string, string | undefined>;
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const conditions: SQL[] = [];
    if (targetType) conditions.push(eq(auditLogsTable.targetType, String(targetType)));
    if (targetId) conditions.push(eq(auditLogsTable.targetId, String(targetId)));
    const rows = await db
      .select({ l: auditLogsTable, actorName: usersTable.fullName })
      .from(auditLogsTable)
      .leftJoin(usersTable, eq(auditLogsTable.actorUserId, usersTable.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(limit);
    res.json(
      rows.map(({ l, actorName }) => ({
        id: l.id,
        actorUserId: l.actorUserId ?? null,
        actorName: actorName ?? null,
        actorRole: l.actorRole,
        action: l.action,
        targetType: l.targetType ?? null,
        targetId: l.targetId ?? null,
        details: (l.details as Record<string, unknown> | null) ?? null,
        createdAt: l.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    sendError(req, res, err);
  }
});

export default router;
