/**
 * Cloudflare Workers entry point (wrangler.jsonc at the repository root).
 * The same Express application as on a Node server, run through Cloudflare's
 * Node.js HTTP server support. The web app's files are served by Cloudflare
 * static assets; only /api/* reaches this Worker.
 *
 * Database: through Hyperdrive (binding HYPERDRIVE), one connection per
 * request. Configuration: `vars` of wrangler.jsonc and the Worker's secrets
 * (SUPABASE_SERVICE_ROLE_KEY), read through process.env.
 */
import { httpServerHandler } from "cloudflare:node";
import { env } from "cloudflare:workers";
import app from "./app";
import { useRequestDatabase } from "./middlewares/requestDatabase";

const PORT = 8080;

useRequestDatabase(() => {
  const hyperdrive = (env as { HYPERDRIVE?: { connectionString?: string } }).HYPERDRIVE;
  return hyperdrive?.connectionString ?? process.env.DATABASE_URL;
});

app.listen(PORT);

export default httpServerHandler({ port: PORT });
