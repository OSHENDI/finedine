import { strict as assert } from "node:assert";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { applyLegacySchema } from "./fixtures/legacy-ddl";

const migrationsFolder = path.join(process.cwd(), "drizzle");

async function columns(client: PGlite) {
  const result = await client.query<{ line: string }>(
    `SELECT table_name || '.' || column_name || ' ' || data_type || ' null=' || is_nullable || ' default=' || coalesce(column_default, '') AS line
     FROM information_schema.columns WHERE table_schema = 'public' ORDER BY 1`
  );
  return result.rows.map((row) => row.line);
}

async function applied(client: PGlite) {
  const result = await client.query<{ count: number }>(`SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations`);
  return result.rows[0].count;
}

// --- a new database is built from the migrations alone
const fresh = new PGlite();
await migrate(drizzle(fresh), { migrationsFolder });
const freshColumns = await columns(fresh);
assert.ok(freshColumns.some((line) => line.startsWith("users.is_active boolean")), "fresh database has users.is_active");
assert.ok(freshColumns.some((line) => line.startsWith("orders.idempotency_key")), "fresh database has the late orders columns");
const migrationCount = await applied(fresh);
await migrate(drizzle(fresh), { migrationsFolder });
assert.equal(await applied(fresh), migrationCount, "running migrations twice changes nothing");

// --- a database made by the old hand-written DDL is upgraded in place and keeps its data
const legacy = new PGlite();
await applyLegacySchema((statement) => legacy.exec(statement));
assert.ok(!(await columns(legacy)).some((line) => line.startsWith("users.is_active")), "legacy fixture predates users.is_active");
await legacy.exec(`
  INSERT INTO businesses (id, name, slug) VALUES ('00000000-0000-4000-8000-000000000001', 'Old Cafe', 'old-cafe');
  INSERT INTO branches (id, business_id, name, slug, address, phone) VALUES ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'Main', 'old-main', 'x', 'y');
  INSERT INTO users (id, business_id, email, name, password_hash, role) VALUES ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'old@cafe.test', 'Old Owner', 'hash', 'owner');
  INSERT INTO payment_methods (id, business_id, branch_id, label, type, account_name, phone, details) VALUES ('00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'Cash', 'cash_or_card', '', '', '');
  INSERT INTO orders (id, business_id, branch_id, order_number, public_token_hash, customer_name, customer_phone, total_cents, payment_method_id, payment_method_label, transfer_from_phone, transfer_reference, line_items)
  VALUES ('00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 1042, 'tokenhash', 'A B', '059', 500, '00000000-0000-4000-8000-000000000004', 'Cash', '', '', '[]');
`);
await migrate(drizzle(legacy), { migrationsFolder });
await migrate(drizzle(legacy), { migrationsFolder });
assert.equal(await applied(legacy), migrationCount, "legacy database ends up on the same migration level");
const user = await legacy.query<{ is_active: boolean; email: string }>(`SELECT is_active, email FROM users`);
assert.deepEqual(user.rows, [{ is_active: true, email: "old@cafe.test" }], "existing users survive and are active");
const counter = await legacy.query<{ next_order_number: number }>(`SELECT next_order_number FROM branches`);
assert.equal(counter.rows[0].next_order_number, 1043, "order counter stays ahead of existing orders");
assert.equal((await legacy.query(`SELECT 1 FROM orders`)).rows.length, 1, "existing orders survive");

// no table is left with two foreign keys on the same column, and the column set matches a fresh database
const duplicateForeignKeys = await legacy.query(
  `SELECT conrelid::regclass::text AS tbl, conkey FROM pg_constraint WHERE contype = 'f' GROUP BY conrelid, conkey HAVING count(*) > 1`
);
assert.equal(duplicateForeignKeys.rows.length, 0, "baseline does not duplicate legacy foreign keys");
assert.deepEqual(await columns(legacy), freshColumns, "upgraded database has the same columns as a fresh one");

console.log("migrations ok", { migrations: migrationCount });
