import {
  db,
  usersTable,
  storedFilesTable,
  transitaireApplicationsTable,
  transitaireApplicationDocumentsTable,
  transitaireAccessDecisionsTable,
  type TransitaireApplication,
  type StoredFile,
  type User,
} from "@workspace/db";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { HttpError } from "./httpErrors";

export const MAX_DOCUMENTS_PER_APPLICATION = 5;
export const JUSTIFICATIF_PURPOSE = "transitaire_justificatif";

export function mapDocument(f: StoredFile) {
  return {
    id: f.id,
    originalName: f.originalName,
    contentType: f.contentType,
    sizeBytes: f.sizeBytes,
    createdAt: f.createdAt.toISOString(),
  };
}

export async function documentsOf(applicationIds: string[]) {
  if (!applicationIds.length) return new Map<string, StoredFile[]>();
  const rows = await db
    .select({ applicationId: transitaireApplicationDocumentsTable.applicationId, file: storedFilesTable })
    .from(transitaireApplicationDocumentsTable)
    .innerJoin(storedFilesTable, eq(transitaireApplicationDocumentsTable.fileId, storedFilesTable.id))
    .where(and(inArray(transitaireApplicationDocumentsTable.applicationId, applicationIds), isNull(storedFilesTable.deletedAt)))
    .orderBy(asc(storedFilesTable.createdAt));
  const byApp = new Map<string, StoredFile[]>();
  for (const r of rows) byApp.set(r.applicationId, [...(byApp.get(r.applicationId) ?? []), r.file]);
  return byApp;
}

export function mapApplication(a: TransitaireApplication, documents: StoredFile[]) {
  return {
    id: a.id,
    agrementNumber: a.agrementNumber,
    message: a.message ?? null,
    status: a.status,
    createdAt: a.createdAt.toISOString(),
    decidedAt: a.decidedAt?.toISOString() ?? null,
    decisionReason: a.decisionReason ?? null,
    documents: documents.map(mapDocument),
  };
}

export function mapApplicant(u: User) {
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    poste: u.poste ?? null,
    accountKind: u.accountKind,
    transitaireStatus: u.transitaireStatus,
  };
}

export function mapTransitaireUser(u: User) {
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    transitaireStatus: u.transitaireStatus,
    transitaireStatusChangedAt: u.transitaireStatusChangedAt?.toISOString() ?? null,
  };
}

/** A user may apply when not active, not suspended and nothing pending. */
export function canApply(user: User) {
  return user.transitaireStatus === "none" || user.transitaireStatus === "revoked";
}

/** The document `fileId` attached to `applicationId`, or 404. */
export async function findApplicationDocument(applicationId: string, fileId: string): Promise<StoredFile> {
  const [row] = await db
    .select({ file: storedFilesTable })
    .from(transitaireApplicationDocumentsTable)
    .innerJoin(storedFilesTable, eq(transitaireApplicationDocumentsTable.fileId, storedFilesTable.id))
    .where(
      and(
        eq(transitaireApplicationDocumentsTable.applicationId, applicationId),
        eq(transitaireApplicationDocumentsTable.fileId, fileId),
        isNull(storedFilesTable.deletedAt),
      ),
    )
    .limit(1);
  if (!row) throw new HttpError(404, "NOT_FOUND", "Document introuvable.");
  return row.file;
}

export async function decisionsFor(userId: string) {
  const decider = alias(usersTable, "decider");
  const rows = await db
    .select({ d: transitaireAccessDecisionsTable, deciderName: decider.fullName })
    .from(transitaireAccessDecisionsTable)
    .leftJoin(decider, eq(transitaireAccessDecisionsTable.decidedByUserId, decider.id))
    .where(eq(transitaireAccessDecisionsTable.userId, userId))
    .orderBy(desc(transitaireAccessDecisionsTable.createdAt));
  return rows.map(({ d, deciderName }) => ({
    id: d.id,
    decision: d.decision,
    reason: d.reason ?? null,
    decidedByName: deciderName ?? null,
    applicationId: d.applicationId ?? null,
    createdAt: d.createdAt.toISOString(),
  }));
}

export async function loadApplication(id: string) {
  const [application] = await db
    .select()
    .from(transitaireApplicationsTable)
    .where(eq(transitaireApplicationsTable.id, id))
    .limit(1);
  return application ?? null;
}
