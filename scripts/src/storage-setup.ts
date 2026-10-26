/**
 * Creates (or checks) the PRIVATE Supabase Storage bucket used for private
 * files. Run once per Supabase project, with the server secrets:
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm --filter @workspace/scripts run storage-setup
 *
 * Never makes a bucket public; stops if an existing bucket is public.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "simdouane-private";
const MAX_BYTES = 10 * 1024 * 1024;
const MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];

async function main() {
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  const storage = createClient(url, key, { auth: { persistSession: false } }).storage;

  const existing = await storage.getBucket(bucket);
  if (existing.data) {
    if (existing.data.public) {
      throw new Error(`Bucket "${bucket}" is PUBLIC. Make it private in the Supabase dashboard before use.`);
    }
    console.log(`Bucket "${bucket}" exists and is private.`);
    return;
  }
  const created = await storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: MIME_TYPES,
  });
  if (created.error) throw created.error;
  console.log(`Private bucket "${bucket}" created (10 MB, PDF/JPEG/PNG).`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
