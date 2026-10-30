// Modules provided by the Cloudflare Workers runtime (only used by src/worker.ts).
declare module "cloudflare:node" {
  export function httpServerHandler(options: { port: number }): unknown;
}

declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}
