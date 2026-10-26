// Upload and download of private files through the API.
// The generated `uploadTransitaireDocument` serialises the body as JSON and
// cannot send a file: use `uploadTransitaireDocumentFile` instead.

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export class UploadError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function uploadTransitaireDocumentFile(applicationId: string, file: File) {
  // Same base as the generated client (orval baseUrl "/api").
  const res = await fetch(`/api/transitaire-access/applications/${encodeURIComponent(applicationId)}/documents`, {
    method: "POST",
    headers: { "content-type": "application/octet-stream", "x-file-name": encodeURIComponent(file.name) },
    body: file,
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new UploadError(data?.message ?? "Envoi impossible.", res.status);
  return data;
}

/**
 * Opens a short-lived link. The server answers with
 * "Content-Disposition: attachment" and the original file name, so the
 * browser downloads it without leaving the page. A link click is not blocked
 * after an await, unlike window.open.
 */
export function startDownload(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
