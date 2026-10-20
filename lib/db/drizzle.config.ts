import { defineConfig } from "drizzle-kit";
import path from "path";

// `generate` only compares the schema with the existing migration files and
// does not open a connection; the other commands need a real DATABASE_URL.
const url = process.env.DATABASE_URL ?? "postgresql://unused@localhost/unused";

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  out: "./migrations", // relative to lib/db (where the scripts run)
  dialect: "postgresql",
  dbCredentials: { url },
});
