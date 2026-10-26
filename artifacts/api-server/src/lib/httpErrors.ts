import type { Request, Response } from "express";

/** Error with an HTTP status and a stable code the frontend can rely on. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

/** Common catch-all for route handlers: known errors keep their status. */
export function sendError(req: Request, res: Response, err: unknown) {
  if (err instanceof HttpError) {
    if (err.status >= 500) req.log.error(err);
    res.status(err.status).json({ error: err.code, message: err.message, ...err.details });
    return;
  }
  req.log.error(err);
  res.status(500).json({ error: "Internal error" });
}

/** PostgreSQL unique violation (drizzle wraps driver errors in `cause`). */
export function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "23505" || e?.cause?.code === "23505";
}
