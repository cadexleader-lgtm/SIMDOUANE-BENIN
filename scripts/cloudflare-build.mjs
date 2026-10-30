// Build of the web app for Cloudflare (Workers Builds: `pnpm run build:cloudflare`).
// The browser settings (Supabase address, PUBLIC key, admin emails) come from
// the `vars` of wrangler.jsonc, the single source of the deployment's public
// configuration. A value already set in the environment wins (local tests).
// Never put a secret in wrangler.jsonc: secrets are set in Cloudflare.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const { vars = {} } = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
const env = {
  ...process.env,
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? vars.SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? vars.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  VITE_ADMIN_EMAILS: process.env.VITE_ADMIN_EMAILS ?? vars.ADMIN_EMAILS,
  BASE_PATH: "/",
};
for (const key of ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_ADMIN_EMAILS"]) {
  if (!env[key]) {
    console.error(`[cloudflare-build] ${key} is missing (wrangler.jsonc vars)`);
    process.exit(1);
  }
}
const result = spawnSync("pnpm", ["--filter", "@workspace/simdouane", "run", "build"], { env, stdio: "inherit" });
process.exit(result.status ?? 1);
