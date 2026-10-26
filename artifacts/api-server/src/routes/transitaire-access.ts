import express, { Router } from "express";
import { db, usersTable, transitaireApplicationsTable, transitaireApplicationDocumentsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { CreateTransitaireApplicationBody } from "@workspace/api-zod";
import { requireUser, requireActiveTransitaire, type AuthedRequest } from "../middlewares/requireAuth";
import { HttpError, isUniqueViolation, sendError } from "../lib/httpErrors";
import { audit } from "../lib/audit";
import { createDownloadLink, DOWNLOAD_LINK_SECONDS, MAX_UPLOAD_BYTES, saveUploadedFile } from "../lib/files/storedFiles";
import {
  canApply,
  documentsOf,
  findApplicationDocument,
  JUSTIFICATIF_PURPOSE,
  loadApplication,
  mapApplication,
  MAX_DOCUMENTS_PER_APPLICATION,
} from "../lib/transitaireAccess";

export const transitaireAccessRouter = Router();

/** The caller's own application, or 404 (never reveals other users' ones). */
async function ownApplication(req: express.Request) {
  const user = (req as AuthedRequest).currentUser;
  const application = await loadApplication(String(req.params.id));
  if (!application || application.userId !== user.id) {
    throw new HttpError(404, "NOT_FOUND", "Demande introuvable.");
  }
  return application;
}

// GET /api/transitaire-access
transitaireAccessRouter.get("/", requireUser, async (req, res) => {
  try {
    const user = (req as AuthedRequest).currentUser;
    const applications = await db
      .select()
      .from(transitaireApplicationsTable)
      .where(eq(transitaireApplicationsTable.userId, user.id))
      .orderBy(desc(transitaireApplicationsTable.createdAt));
    const docs = await documentsOf(applications.map((a) => a.id));
    res.json({
      status: user.transitaireStatus,
      statusChangedAt: user.transitaireStatusChangedAt?.toISOString() ?? null,
      canApply: canApply(user),
      applications: applications.map((a) => mapApplication(a, docs.get(a.id) ?? [])),
    });
  } catch (err) {
    sendError(req, res, err);
  }
});

// POST /api/transitaire-access/applications
transitaireAccessRouter.post("/applications", requireUser, async (req, res) => {
  try {
    const user = (req as AuthedRequest).currentUser;
    const parsed = CreateTransitaireApplicationBody.safeParse({
      ...req.body,
      agrementNumber: typeof req.body?.agrementNumber === "string" ? req.body.agrementNumber.trim() : req.body?.agrementNumber,
    });
    if (!parsed.success) throw new HttpError(400, "INVALID_INPUT", "Numéro d'agrément requis (2 à 60 caractères).");
    if (user.transitaireStatus === "active") throw new HttpError(409, "ALREADY_ACTIVE", "Votre accès transitaire est déjà actif.");
    if (user.transitaireStatus === "suspended") {
      throw new HttpError(409, "ACCESS_SUSPENDED", "Votre accès transitaire est suspendu. Contactez l'administrateur.");
    }
    if (user.transitaireStatus === "pending") {
      throw new HttpError(409, "APPLICATION_PENDING", "Une demande est déjà en cours d'examen.");
    }

    const application = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(transitaireApplicationsTable)
        .values({ userId: user.id, agrementNumber: parsed.data.agrementNumber, message: parsed.data.message?.trim() || null })
        .returning();
      await tx
        .update(usersTable)
        .set({ transitaireStatus: "pending", transitaireStatusChangedAt: new Date(), updatedAt: new Date() })
        .where(eq(usersTable.id, user.id));
      await audit(
        { actorUserId: user.id, actorRole: "user", action: "transitaire.application_submitted", targetType: "transitaire_application", targetId: created.id },
        tx,
      );
      return created;
    }).catch((err) => {
      // Concurrent submission: the partial unique index keeps one pending request.
      if (isUniqueViolation(err)) throw new HttpError(409, "APPLICATION_PENDING", "Une demande est déjà en cours d'examen.");
      throw err;
    });
    res.status(201).json(mapApplication(application, []));
  } catch (err) {
    sendError(req, res, err);
  }
});

// POST /api/transitaire-access/applications/:id/documents  (raw bytes)
transitaireAccessRouter.post(
  "/applications/:id/documents",
  requireUser,
  express.raw({ type: () => true, limit: MAX_UPLOAD_BYTES }),
  async (req, res) => {
    try {
      const user = (req as AuthedRequest).currentUser;
      const application = await ownApplication(req);
      if (application.status !== "submitted") {
        throw new HttpError(409, "APPLICATION_CLOSED", "Cette demande a déjà été traitée.");
      }
      const existing = (await documentsOf([application.id])).get(application.id) ?? [];
      if (existing.length >= MAX_DOCUMENTS_PER_APPLICATION) {
        throw new HttpError(409, "TOO_MANY_DOCUMENTS", `${MAX_DOCUMENTS_PER_APPLICATION} justificatifs maximum.`);
      }
      if (!Buffer.isBuffer(req.body)) throw new HttpError(400, "EMPTY_FILE", "Aucun fichier reçu.");

      let declaredName: string | undefined;
      try {
        declaredName = decodeURIComponent(String(req.get("x-file-name") ?? ""));
      } catch {
        declaredName = undefined;
      }
      const file = await saveUploadedFile({
        data: req.body,
        declaredName,
        purpose: JUSTIFICATIF_PURPOSE,
        uploadedByUserId: user.id,
        keyPrefix: `transitaire-applications/${application.id}`,
      });
      await db.insert(transitaireApplicationDocumentsTable).values({ applicationId: application.id, fileId: file.id });
      await audit({
        actorUserId: user.id,
        actorRole: "user",
        action: "file.uploaded",
        targetType: "stored_file",
        targetId: file.id,
        details: { purpose: JUSTIFICATIF_PURPOSE, applicationId: application.id, sizeBytes: file.sizeBytes },
      });
      res.status(201).json({
        id: file.id,
        originalName: file.originalName,
        contentType: file.contentType,
        sizeBytes: file.sizeBytes,
        createdAt: file.createdAt.toISOString(),
      });
    } catch (err) {
      sendError(req, res, err);
    }
  },
);

// POST /api/transitaire-access/applications/:id/documents/:fileId/download-link
transitaireAccessRouter.post("/applications/:id/documents/:fileId/download-link", requireUser, async (req, res) => {
  try {
    const user = (req as AuthedRequest).currentUser;
    const application = await ownApplication(req);
    const file = await findApplicationDocument(application.id, String(req.params.fileId));
    const url = await createDownloadLink(file);
    await audit({
      actorUserId: user.id,
      actorRole: "user",
      action: "file.download_link_issued",
      targetType: "stored_file",
      targetId: file.id,
      details: { purpose: file.purpose, applicationId: application.id },
    });
    res.json({ url, expiresInSeconds: DOWNLOAD_LINK_SECONDS });
  } catch (err) {
    sendError(req, res, err);
  }
});

// GET /api/transitaire/space — entry point of transitaire-only features.
// Phase 5 adds the dossiers shared with the transitaire here.
export const transitaireSpaceRouter = Router();
transitaireSpaceRouter.get("/space", requireActiveTransitaire, async (req, res) => {
  try {
    const user = (req as AuthedRequest).currentUser;
    res.json({ status: user.transitaireStatus, activeSince: user.transitaireStatusChangedAt?.toISOString() ?? null });
  } catch (err) {
    sendError(req, res, err);
  }
});

