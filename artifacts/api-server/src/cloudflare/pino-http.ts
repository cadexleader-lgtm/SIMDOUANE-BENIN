/**
 * Cloudflare Workers replacement for `pino-http` (wrangler.jsonc `alias`):
 * the real module relies on parts of pino that the Workers build does not
 * have. Same role: `req.log` for the routes, one line per request (method,
 * path without query string, status, duration) in the Worker's logs.
 * Headers, bodies and tokens are never logged.
 */
import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger";

export default function pinoHttp(_options?: unknown) {
  return (req: Request, res: Response, next: NextFunction) => {
    const started = Date.now();
    (req as unknown as { log: typeof logger }).log = logger;
    res.once("finish", () => {
      logger.info(
        { method: req.method, path: (req.originalUrl ?? req.url).split("?")[0], status: res.statusCode, ms: Date.now() - started },
        "request",
      );
    });
    next();
  };
}
