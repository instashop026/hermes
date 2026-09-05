import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Supabase exposes two pooler endpoints:
//   • DATABASE_URL  → transaction-mode pooler (:6543, pgbouncer) — times out
//     in this environment even on a plain `select 1` (08006 EAUTHTIMEOUT).
//   • DIRECT_URL    → session-mode pooler (:5432) — reliable for both plain
//     queries AND db.transaction(). Prefer it for the live app.
// NOTE: use bracket access (process.env["X"]) so esbuild does NOT inline the
// value at build time (the build runs without .env loaded; only dev-loader
// injects env at runtime before importing the bundle).
const env = process.env as Record<string, string | undefined>;
const connectionString = env["DIRECT_URL"] || env["DATABASE_URL"];

if (!connectionString) {
  throw new Error(
    "DIRECT_URL (or DATABASE_URL) must be set. Did you forget to provision a database?",
  );
}

// `prepare: false` keeps drizzle on the simple query protocol. Required for
// poolers that don't support extended-protocol prepared statements, and safe
// everywhere. `prepare` is a real pg@8.13+ runtime option but isn't in older
// @types/pg, hence the cast.
export const pool = new Pool({
  connectionString,
  prepare: false,
} as ConstructorParameters<typeof Pool>[0]);
export const db = drizzle(pool, { schema });

export * from "./schema";
