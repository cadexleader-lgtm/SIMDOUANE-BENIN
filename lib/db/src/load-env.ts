/**
 * Command-line scripts (migrate, seed, storage-setup, db-report) load the
 * workspace-root .env like `pnpm dev` does. Import this module FIRST, before
 * anything that reads process.env. Variables already set in the environment
 * (shell, CI, hosting provider) always win over the file.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function loadRootEnv(): void {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (;;) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      const envFile = path.join(dir, ".env");
      if (existsSync(envFile)) process.loadEnvFile(envFile);
      return;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}

loadRootEnv();
