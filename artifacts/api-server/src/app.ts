import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { requestDatabase } from "./middlewares/requestDatabase";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// The web app calls the API on the same origin, so CORS is only needed for
// other origins explicitly listed in CORS_ORIGINS (comma-separated).
// In development every origin stays allowed, as before.
const corsOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    credentials: true,
    origin: corsOrigins.length
      ? corsOrigins
      : process.env.NODE_ENV !== "production",
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cloudflare Workers only: a database connection per request (no-op on Node).
app.use("/api", requestDatabase);
app.use("/api", router);

// Body parsing errors (malformed JSON, upload too large) as JSON, not HTML.
app.use("/api", (err: any, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) return next(err);
  if (err?.type === "entity.too.large") {
    res.status(413).json({ error: "FILE_TOO_LARGE", message: "Le fichier dépasse la taille autorisée." });
    return;
  }
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: "INVALID_JSON" });
    return;
  }
  req.log.error(err);
  res.status(500).json({ error: "Internal error" });
});

// Optional: serve the built web app (artifacts/simdouane/dist/public) from
// this same process, so one Node server can host the whole application
// outside Replit. Unknown non-API GET routes fall back to index.html.
const webDistDir = process.env.WEB_DIST_DIR
  ? path.resolve(process.env.WEB_DIST_DIR)
  : undefined;
if (webDistDir) {
  const indexHtml = path.join(webDistDir, "index.html");
  if (!existsSync(indexHtml)) {
    throw new Error(`WEB_DIST_DIR has no index.html: ${webDistDir}`);
  }
  app.use(express.static(webDistDir, { index: false, maxAge: "1h" }));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) return next();
    res.sendFile(indexHtml);
  });
}

export default app;
