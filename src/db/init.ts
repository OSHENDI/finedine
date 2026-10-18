import { readFileSync } from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { getDbState } from "@/src/db/client";

// The schema is defined by the migrations in ./drizzle (generate new ones with `npm run db:generate`).
// Embedded PGlite has no deploy step, so it is migrated here on first use. A real Postgres
// is migrated by `npm run db:migrate` (scripts/migrate.mjs, run automatically before `npm start`);
// here we only check that this has happened, so a forgotten migration gives a clear error.
export const migrationsFolder = () => path.join(process.cwd(), "drizzle");

export async function ensureDatabase() {
  const { db, mode } = getDbState();
  if (mode === "pglite") {
    await migratePglite(db as unknown as Parameters<typeof migratePglite>[0], { migrationsFolder: migrationsFolder() });
    return;
  }
  await assertMigrated(db);
}

async function assertMigrated(db: ReturnType<typeof getDbState>["db"]) {
  let expected: number;
  try {
    const journal = JSON.parse(readFileSync(path.join(migrationsFolder(), "meta", "_journal.json"), "utf8")) as { entries: unknown[] };
    expected = journal.entries.length;
  } catch {
    console.warn("[finedine] ./drizzle folder not found, skipping the migration check.");
    return;
  }

  let applied = 0;
  try {
    const result = (await db.execute(sql`SELECT count(*)::int AS applied FROM drizzle.__drizzle_migrations`)) as unknown as
      | Array<{ applied: number }>
      | { rows: Array<{ applied: number }> };
    applied = (Array.isArray(result) ? result : result.rows)[0]?.applied ?? 0;
  } catch {
    // The table does not exist yet: nothing has been migrated.
  }
  if (applied < expected) {
    throw new Error(`Database is not up to date (${applied} of ${expected} migrations applied). Run "npm run db:migrate" first.`);
  }
}
