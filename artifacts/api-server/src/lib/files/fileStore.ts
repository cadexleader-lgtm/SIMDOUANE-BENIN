import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

export type DownloadOptions = { fileName: string; contentType: string; expiresInSeconds: number };

/** Private storage of file bytes. Nothing in it is ever publicly readable. */
export interface FileStore {
  readonly driver: "local" | "supabase";
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  remove(key: string): Promise<void>;
  /** Short-lived link, valid `expiresInSeconds`, forcing a download. */
  createDownloadUrl(key: string, options: DownloadOptions): Promise<string>;
}

const KEY_PATTERN = /^[a-z0-9-]+(\/[a-z0-9-]+)*\.[a-z0-9]+$/;

function assertSafeKey(key: string) {
  if (!KEY_PATTERN.test(key)) throw new Error(`Unsafe storage key: ${key}`);
}

/* ─── Local disk (development, tests) ─────────────────────────────────── */

type LocalToken = { k: string; n: string; t: string; e: number };

export const LOCAL_DOWNLOAD_PATH = "/api/files/local";

/**
 * Files under FILE_STORAGE_DIR; downloads go through LOCAL_DOWNLOAD_PATH
 * with an HMAC-signed, expiring token (same behaviour as a Supabase signed
 * URL). Meant for development and tests with fictitious documents only.
 */
export class LocalFileStore implements FileStore {
  readonly driver = "local" as const;

  constructor(
    private readonly rootDir: string,
    private readonly secret: Buffer,
  ) {}

  private pathFor(key: string) {
    assertSafeKey(key);
    return path.join(this.rootDir, key);
  }

  async put(key: string, data: Buffer) {
    const target = this.pathFor(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data, { flag: "wx" }); // never overwrite
  }

  async remove(key: string) {
    await rm(this.pathFor(key), { force: true });
  }

  async createDownloadUrl(key: string, { fileName, contentType, expiresInSeconds }: DownloadOptions) {
    assertSafeKey(key);
    const payload: LocalToken = { k: key, n: fileName, t: contentType, e: Date.now() + expiresInSeconds * 1000 };
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${LOCAL_DOWNLOAD_PATH}/${body}.${this.sign(body)}`;
  }

  /** Returns the file for a valid, unexpired token; null otherwise. */
  async readWithToken(token: string): Promise<{ data: Buffer; fileName: string; contentType: string } | null> {
    const [body, signature] = token.split(".");
    if (!body || !signature) return null;
    const expected = Buffer.from(this.sign(body));
    const given = Buffer.from(signature);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    let payload: LocalToken;
    try {
      payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    } catch {
      return null;
    }
    if (typeof payload.e !== "number" || Date.now() > payload.e) return null;
    try {
      return { data: await readFile(this.pathFor(payload.k)), fileName: payload.n, contentType: payload.t };
    } catch {
      return null;
    }
  }

  private sign(body: string) {
    return createHmac("sha256", this.secret).update(body).digest("base64url");
  }
}

/* ─── Supabase Storage, private bucket (production) ───────────────────── */

export class SupabaseFileStore implements FileStore {
  readonly driver = "supabase" as const;
  private readonly bucket;

  constructor(url: string, serviceRoleKey: string, bucketName: string) {
    // Service role key: server only, never sent to the browser.
    const client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    this.bucket = client.storage.from(bucketName);
  }

  async put(key: string, data: Buffer, contentType: string) {
    assertSafeKey(key);
    const { error } = await this.bucket.upload(key, data, { contentType, upsert: false });
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);
  }

  async remove(key: string) {
    assertSafeKey(key);
    const { error } = await this.bucket.remove([key]);
    if (error) throw new Error(`Supabase remove failed: ${error.message}`);
  }

  async createDownloadUrl(key: string, { fileName, expiresInSeconds }: DownloadOptions) {
    assertSafeKey(key);
    const { data, error } = await this.bucket.createSignedUrl(key, expiresInSeconds, { download: fileName });
    if (error || !data) throw new Error(`Supabase signed URL failed: ${error?.message}`);
    return data.signedUrl;
  }
}

/* ─── Configuration ───────────────────────────────────────────────────── */

let instance: FileStore | undefined;

/**
 * STORAGE_DRIVER=local (default outside production) or supabase.
 * local:    FILE_STORAGE_DIR (default ./.data/files), FILE_URL_SIGNING_SECRET
 *           (required in production; random per process otherwise).
 * supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET.
 */
export function getFileStore(): FileStore {
  if (instance) return instance;
  const production = process.env.NODE_ENV === "production";
  const driver = process.env.STORAGE_DRIVER || (production ? "" : "local");

  if (driver === "supabase") {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "simdouane-private";
    if (!url || !key) throw new Error("STORAGE_DRIVER=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    instance = new SupabaseFileStore(url, key, bucket);
  } else if (driver === "local") {
    const secret = process.env.FILE_URL_SIGNING_SECRET;
    if (production && !secret) throw new Error("FILE_URL_SIGNING_SECRET is required with local storage in production");
    instance = new LocalFileStore(
      path.resolve(process.env.FILE_STORAGE_DIR || ".data/files"),
      secret ? Buffer.from(secret) : randomBytes(32),
    );
  } else {
    throw new Error("STORAGE_DRIVER must be set to 'supabase' (or 'local') in production");
  }
  return instance;
}

/** Tests only. */
export function setFileStoreForTests(store: FileStore | undefined) {
  instance = store;
}
