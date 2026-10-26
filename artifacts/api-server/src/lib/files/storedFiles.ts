import { createHash, randomUUID } from "node:crypto";
import { db, storedFilesTable, type StoredFile } from "@workspace/db";
import { HttpError } from "../httpErrors";
import { detectFileType, sanitizeFileName } from "./fileType";
import { getFileStore } from "./fileStore";

export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 10 * 1024 * 1024;

/** Lifetime of a download link handed out by the API. */
export const DOWNLOAD_LINK_SECONDS = 60;

/**
 * Validates and stores an uploaded file, then records its metadata.
 * Only PDF, PNG and JPEG are accepted, recognised from their bytes.
 */
export async function saveUploadedFile(input: {
  data: Buffer;
  declaredName: string | undefined;
  purpose: string;
  uploadedByUserId: string;
  keyPrefix: string;
}): Promise<StoredFile> {
  const { data } = input;
  if (!data.length) throw new HttpError(400, "EMPTY_FILE", "Le fichier est vide.");
  if (data.length > MAX_UPLOAD_BYTES) {
    throw new HttpError(413, "FILE_TOO_LARGE", `Le fichier dépasse ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} Mo.`);
  }
  const type = detectFileType(data);
  if (!type) throw new HttpError(415, "UNSUPPORTED_FILE_TYPE", "Formats acceptés : PDF, JPEG, PNG.");

  const store = getFileStore();
  const storageKey = `${input.keyPrefix}/${randomUUID()}.${type.extension}`;
  await store.put(storageKey, data, type.contentType);
  try {
    const [row] = await db
      .insert(storedFilesTable)
      .values({
        purpose: input.purpose,
        uploadedByUserId: input.uploadedByUserId,
        storageDriver: store.driver,
        storageKey,
        originalName: sanitizeFileName(input.declaredName, type.extension),
        contentType: type.contentType,
        sizeBytes: data.length,
        sha256: createHash("sha256").update(data).digest("hex"),
      })
      .returning();
    return row;
  } catch (err) {
    await store.remove(storageKey).catch(() => undefined); // no orphan bytes
    throw err;
  }
}

export function createDownloadLink(file: StoredFile) {
  return getFileStore().createDownloadUrl(file.storageKey, {
    fileName: file.originalName,
    contentType: file.contentType,
    expiresInSeconds: DOWNLOAD_LINK_SECONDS,
  });
}
