import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/src/db/schema";

type PgliteDb = ReturnType<typeof drizzlePglite<typeof schema>>;
type PostgresDb = ReturnType<typeof drizzlePostgres<typeof schema>>;
export type AppDb = PgliteDb | PostgresDb;

type DbState = {
  db: AppDb;
  client: PGlite | ReturnType<typeof postgres>;
  mode: "pglite" | "postgres";
};

const globalForDb = globalThis as unknown as { fineDineDb?: DbState };

export function getDbState(): DbState {
  if (globalForDb.fineDineDb) return globalForDb.fineDineDb;

  const url = process.env.DATABASE_URL;
  if (url?.startsWith("postgres://") || url?.startsWith("postgresql://")) {
    const client = postgres(url, { max: 10, prepare: false });
    globalForDb.fineDineDb = {
      db: drizzlePostgres(client, { schema }),
      client,
      mode: "postgres"
    };
    return globalForDb.fineDineDb;
  }

  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PGLITE !== "true") {
    throw new Error("DATABASE_URL (postgres:// or postgresql://) is required in production. Set ALLOW_PGLITE=true only for single-process demos.");
  }

  const client =
    process.env.PGLITE_DATA_DIR === "memory://"
      ? new PGlite()
      : new PGlite(process.env.PGLITE_DATA_DIR ?? "./.pgdata");
  globalForDb.fineDineDb = {
    db: drizzlePglite(client, { schema }),
    client,
    mode: "pglite"
  };
  return globalForDb.fineDineDb;
}

export function getDb() {
  return getDbState().db;
}
