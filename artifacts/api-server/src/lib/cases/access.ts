import { db, clearanceCasesTable, vehiclesTable, type ClearanceCase, type User, type Vehicle } from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";
import { HttpError } from "../httpErrors";

export type CaseAction = "read" | "write";

/**
 * The single place deciding who may access a file. Phase 3: the owner only.
 * Phase 5 extends it with explicitly invited parties (transitaire).
 * Anything else answers 404, so the existence of a file is never revealed.
 */
export async function loadCaseForUser(
  caseId: string,
  user: User,
  _action: CaseAction,
): Promise<{ file: ClearanceCase; vehicle: Vehicle }> {
  const [row] = await db
    .select({ file: clearanceCasesTable, vehicle: vehiclesTable })
    .from(clearanceCasesTable)
    .innerJoin(vehiclesTable, eq(clearanceCasesTable.vehicleId, vehiclesTable.id))
    .where(and(eq(clearanceCasesTable.id, caseId), isNull(clearanceCasesTable.deletedAt)))
    .limit(1);
  if (!row || row.file.ownerUserId !== user.id) {
    throw new HttpError(404, "NOT_FOUND", "Dossier introuvable.");
  }
  return row;
}
