// Applies the SQL migrations in ./drizzle. Plain JavaScript on purpose: the production image
// runs it with node, without tsx or the TypeScript sources. Safe to run on every start and from
// several instances at once (an advisory lock makes the others wait, then find nothing to do).
import path from "node:path";

const folder = path.resolve(process.env.MIGRATIONS_DIR ?? "drizzle");
const url = process.env.DATABASE_URL;

if (url?.startsWith("postgres://") || url?.startsWith("postgresql://")) {
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const client = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  try {
    await client`SELECT pg_advisory_lock(727274::bigint)`;
    await migrate(drizzle(client), { migrationsFolder: folder });
    await client`SELECT pg_advisory_unlock(727274::bigint)`;
  } finally {
    await client.end();
  }
  console.log("[finedine] Postgres migrations are up to date.");
} else {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PGLITE !== "true") {
    throw new Error("DATABASE_URL (postgres:// or postgresql://) is required in production. Set ALLOW_PGLITE=true only for single-process demos.");
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = process.env.PGLITE_DATA_DIR ?? "./.pgdata";
  const client = dir === "memory://" ? new PGlite() : new PGlite(dir);
  try {
    await migrate(drizzle(client), { migrationsFolder: folder });
  } finally {
    await client.close();
  }
  console.log(`[finedine] PGlite migrations are up to date (${dir}).`);
}
