import type { RequestHandler } from "express";
import { openRequestDatabase } from "@workspace/db";

// Set by the Cloudflare Workers entry point (src/worker.ts) only. On a Node
// server it stays null and every request uses the shared connection pool.
let connectionStringOfRequest: (() => string | undefined) | null = null;

export function useRequestDatabase(getConnectionString: () => string | undefined) {
  connectionStringOfRequest = getConnectionString;
}

/** Cloudflare Workers: one database connection per request, closed once the response is sent. */
export const requestDatabase: RequestHandler = (_req, res, next) => {
  const connectionString = connectionStringOfRequest?.();
  if (!connectionString) {
    next();
    return;
  }
  const connection = openRequestDatabase(connectionString);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    connection.close().catch(() => {});
  };
  res.once("finish", close);
  res.once("close", close);
  connection.run(() => next());
};
