/**
 * Starts the real Express app against TEST_DATABASE_URL (schema from the
 * versioned migrations) with the local private file store in a temp folder.
 * WARNING: `reset()` empties every table of TEST_DATABASE_URL.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { clerkUsers } from "./clerkMock";

export const TEST_DB = process.env.TEST_DATABASE_URL;

export const ALL_TABLES =
  "audit_logs, transitaire_access_decisions, transitaire_application_documents, transitaire_applications, " +
  "stored_files, organization_members, organizations, admin_logs, upgrade_requests, simulations, " +
  "subscriptions, subscription_plans, users";

export async function startTestApp() {
  const filesDir = mkdtempSync(path.join(tmpdir(), "simdouane-files-"));
  process.env.DATABASE_URL = TEST_DB;
  process.env.ADMIN_EMAILS = "admin@test.local";
  process.env.LOG_LEVEL ??= "silent";
  process.env.STORAGE_DRIVER = "local";
  process.env.FILE_STORAGE_DIR = filesDir;
  process.env.FILE_URL_SIGNING_SECRET = "test-secret-not-for-production";
  process.env.MAX_UPLOAD_BYTES = String(200 * 1024);

  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { pool } = await import("@workspace/db");
  await migrate(drizzle(pool), {
    migrationsFolder: new URL("../../../lib/db/migrations", import.meta.url).pathname,
  });
  const { default: app } = await import("../src/app");
  const server: Server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const call = (user: string | null, method: string, apiPath: string, body?: unknown) =>
    fetch(`${baseUrl}/api${apiPath}`, {
      method,
      headers: { "content-type": "application/json", ...(user ? { "x-test-user": user } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  const upload = (user: string | null, apiPath: string, data: Uint8Array, fileName = "justificatif.pdf") =>
    fetch(`${baseUrl}/api${apiPath}`, {
      method: "POST",
      headers: {
        "content-type": "application/octet-stream",
        "x-file-name": encodeURIComponent(fileName),
        ...(user ? { "x-test-user": user } : {}),
      },
      body: data,
    });

  return {
    baseUrl,
    pool,
    call,
    upload,
    async reset() {
      clerkUsers.clear();
      await pool.query(`TRUNCATE ${ALL_TABLES} CASCADE`);
    },
    async close() {
      server.close();
      await pool.end();
      rmSync(filesDir, { recursive: true, force: true });
    },
  };
}

/** Minimal valid files, recognised from their first bytes. */
export const PDF = new Uint8Array(Buffer.from("%PDF-1.4\n% fictitious test document\n%%EOF\n"));
export const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
export const FAKE_PDF = new Uint8Array(Buffer.from("<html>not a pdf</html>"));
