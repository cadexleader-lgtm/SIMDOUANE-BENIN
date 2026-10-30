import { AsyncLocalStorage } from "node:async_hooks";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { poolConfigFromEnv } from "./connection";

type Database = NodePgDatabase<typeof schema>;
type Connection = { pool: pg.Pool; db: Database };

// Node (local server, tests, scripts): one pool for the whole process,
// created on first use from DATABASE_URL.
let shared: Connection | null = null;
function sharedConnection(): Connection {
  if (!shared) {
    const pool = new pg.Pool(poolConfigFromEnv());
    shared = { pool, db: drizzle(pool, { schema }) };
  }
  return shared;
}

// Cloudflare Workers: a connection opened during one request cannot be used
// by another one, so each request gets its own pool (openRequestDatabase).
const requestScope = new AsyncLocalStorage<Connection>();
const current = () => requestScope.getStore() ?? sharedConnection();

/**
 * A database connection for one request only: `run` executes the request
 * with it (everything awaited inside uses it), `close` ends it afterwards.
 */
export function openRequestDatabase(connectionString: string) {
  const pool = new pg.Pool({ connectionString, max: 3 });
  const connection: Connection = { pool, db: drizzle(pool, { schema }) };
  return {
    run: <T>(fn: () => T): T => requestScope.run(connection, fn),
    close: () => pool.end(),
  };
}

// `db` and `pool` keep their usual interface and resolve to the connection
// of the current request when there is one, otherwise to the shared one.
function delegate<T extends object>(target: () => T): T {
  return new Proxy({} as T, {
    get(_unused, property) {
      const actual = target();
      const value = Reflect.get(actual, property, actual);
      return typeof value === "function" ? value.bind(actual) : value;
    },
  });
}

export const db: Database = delegate(() => current().db);
export const pool: pg.Pool = delegate(() => current().pool);

export * from "./schema";
