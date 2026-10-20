import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const envFile = resolve(root, ".env");

if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const children = [];
let stopping = false;

function start(label, args, overrides = {}) {
  const child = spawn("pnpm", args, {
    cwd: root,
    env: { ...process.env, ...overrides },
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  children.push(child);
  child.on("error", (error) => {
    console.error(`[${label}] Unable to start: ${error.message}`);
    stop(1);
  });
  child.on("exit", (code, signal) => {
    if (!stopping) {
      console.error(`[${label}] stopped (${signal ?? `exit ${code ?? 1}`})`);
      stop(code ?? 1);
    }
  });
  return child;
}

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill("SIGTERM");
  }
  process.exitCode = exitCode;
}

process.on("SIGINT", () => stop(130));
process.on("SIGTERM", () => stop(143));

const apiPort = process.env.API_PORT ?? "8080";
const apiTarget = process.env.VITE_API_TARGET ?? `http://127.0.0.1:${apiPort}`;
start("api", ["--filter", "@workspace/api-server", "run", "dev"], {
  NODE_ENV: "development",
  PORT: apiPort,
});
start("web", ["--filter", "@workspace/simdouane", "run", "dev"], {
  PORT: process.env.WEB_PORT ?? "5173",
  BASE_PATH: "/",
  VITE_API_TARGET: apiTarget,
});
