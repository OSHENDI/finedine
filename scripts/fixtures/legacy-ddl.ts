// Frozen copy of the hand-written DDL that src/db/init.ts used before drizzle migrations
// (without the later users.is_active column). scripts/migrations-test.ts builds an "old" database
// from it to prove the baseline migration upgrades existing databases without losing data.
export async function applyLegacySchema(exec: (statement: string) => Promise<unknown>) {
  const db = { execute: (statement: string) => exec(statement) };
  const sql = { raw: (statement: string) => statement };

  await ignoreDuplicate(`CREATE TYPE user_role AS ENUM ('owner', 'manager', 'staff')`);
  await ignoreDuplicate(
    `CREATE TYPE order_status AS ENUM ('new', 'accepted', 'preparing', 'ready', 'completed', 'cancelled')`
  );

  const statements = [
    `CREATE TABLE IF NOT EXISTS businesses (
      id uuid PRIMARY KEY,
      name text NOT NULL,
      slug text NOT NULL UNIQUE,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS branches (
      id uuid PRIMARY KEY,
      business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name text NOT NULL,
      slug text NOT NULL UNIQUE,
      address text NOT NULL,
      phone text NOT NULL,
      currency text NOT NULL DEFAULT 'ILS',
      is_open boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY,
      business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      email text NOT NULL UNIQUE,
      name text NOT NULL,
      password_hash text NOT NULL,
      role user_role NOT NULL DEFAULT 'staff',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
      id uuid PRIMARY KEY,
      business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      name_en text NOT NULL,
      name_ar text NOT NULL,
      sort_order integer NOT NULL DEFAULT 0,
      is_active boolean NOT NULL DEFAULT true
    )`,
    `CREATE TABLE IF NOT EXISTS menu_items (
      id uuid PRIMARY KEY,
      business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      name_en text NOT NULL,
      name_ar text NOT NULL,
      description text NOT NULL,
      image_url text NOT NULL,
      price_cents integer NOT NULL,
      is_available boolean NOT NULL DEFAULT true,
      is_featured boolean NOT NULL DEFAULT false,
      labels text NOT NULL DEFAULT '',
      sort_order integer NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS item_variants (
      id uuid PRIMARY KEY,
      menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
      name text NOT NULL,
      price_delta integer NOT NULL DEFAULT 0,
      sort_order integer NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS item_add_ons (
      id uuid PRIMARY KEY,
      menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
      name text NOT NULL,
      price_cents integer NOT NULL DEFAULT 0,
      sort_order integer NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS payment_methods (
      id uuid PRIMARY KEY,
      business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      label text NOT NULL,
      type text NOT NULL,
      account_name text NOT NULL,
      phone text NOT NULL,
      details text NOT NULL,
      is_default boolean NOT NULL DEFAULT false,
      is_active boolean NOT NULL DEFAULT true
    )`,
    `CREATE TABLE IF NOT EXISTS qr_codes (
      id uuid PRIMARY KEY,
      business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      token_hash text NOT NULL UNIQUE,
      label text NOT NULL,
      table_label text,
      kind text NOT NULL DEFAULT 'branch',
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id uuid PRIMARY KEY,
      business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      order_number integer NOT NULL,
      status order_status NOT NULL DEFAULT 'new',
      public_token_hash text NOT NULL UNIQUE,
      payment_status text NOT NULL DEFAULT 'pending_review',
      qr_code_id uuid REFERENCES qr_codes(id),
      first_name text NOT NULL DEFAULT '',
      last_name text NOT NULL DEFAULT '',
      customer_name text NOT NULL,
      customer_phone text NOT NULL,
      table_label text,
      note text,
      total_cents integer NOT NULL,
      payment_method_id uuid NOT NULL REFERENCES payment_methods(id),
      payment_method_label text NOT NULL,
      transfer_from_phone text NOT NULL,
      transfer_reference text NOT NULL,
      receipt_storage_key text,
      receipt_original_name text,
      receipt_mime_type text,
      receipt_size integer,
      receipt_checksum text,
      line_items jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(branch_id, order_number)
    )`,
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id uuid PRIMARY KEY,
      business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
      actor_user_id uuid REFERENCES users(id),
      action text NOT NULL,
      entity_type text NOT NULL,
      entity_id uuid,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS branches_business_id_idx ON branches(business_id)`,
    `CREATE INDEX IF NOT EXISTS users_business_id_idx ON users(business_id)`,
    `CREATE INDEX IF NOT EXISTS categories_business_id_idx ON categories(business_id)`,
    `CREATE INDEX IF NOT EXISTS categories_branch_sort_idx ON categories(branch_id, sort_order)`,
    `CREATE INDEX IF NOT EXISTS menu_items_business_id_idx ON menu_items(business_id)`,
    `CREATE INDEX IF NOT EXISTS menu_items_branch_category_sort_idx ON menu_items(branch_id, category_id, sort_order)`,
    `CREATE INDEX IF NOT EXISTS item_variants_menu_item_id_idx ON item_variants(menu_item_id)`,
    `CREATE INDEX IF NOT EXISTS item_add_ons_menu_item_id_idx ON item_add_ons(menu_item_id)`,
    `CREATE INDEX IF NOT EXISTS payment_methods_business_id_idx ON payment_methods(business_id)`,
    `CREATE INDEX IF NOT EXISTS payment_methods_branch_id_idx ON payment_methods(branch_id)`,
    `CREATE INDEX IF NOT EXISTS qr_codes_business_id_idx ON qr_codes(business_id)`,
    `CREATE INDEX IF NOT EXISTS qr_codes_branch_id_idx ON qr_codes(branch_id)`,
    `CREATE INDEX IF NOT EXISTS orders_business_id_idx ON orders(business_id)`,
    `CREATE INDEX IF NOT EXISTS orders_branch_status_idx ON orders(branch_id, status, created_at)`,
    `CREATE INDEX IF NOT EXISTS audit_logs_business_id_idx ON audit_logs(business_id)`,
    `CREATE INDEX IF NOT EXISTS audit_logs_branch_id_idx ON audit_logs(branch_id)`
  ];

  for (const statement of statements) {
    await db.execute(sql.raw(statement));
  }

  await ignoreDuplicate(`ALTER TABLE payment_methods ADD COLUMN is_default boolean NOT NULL DEFAULT false`);
  await ignoreDuplicate(`ALTER TABLE orders ADD COLUMN public_token_hash text`);
  await ignoreDuplicate(`ALTER TABLE orders ADD COLUMN payment_status text NOT NULL DEFAULT 'pending_review'`);
  await ignoreDuplicate(`ALTER TABLE orders ADD COLUMN qr_code_id uuid REFERENCES qr_codes(id)`);
  await ignoreDuplicate(`ALTER TABLE orders ADD COLUMN first_name text NOT NULL DEFAULT ''`);
  await ignoreDuplicate(`ALTER TABLE orders ADD COLUMN last_name text NOT NULL DEFAULT ''`);
  await ignoreDuplicate(`ALTER TABLE orders ADD COLUMN receipt_storage_key text`);
  await ignoreDuplicate(`ALTER TABLE orders ADD COLUMN receipt_original_name text`);
  await ignoreDuplicate(`ALTER TABLE orders ADD COLUMN receipt_mime_type text`);
  await ignoreDuplicate(`ALTER TABLE orders ADD COLUMN receipt_size integer`);
  await ignoreDuplicate(`ALTER TABLE orders ADD COLUMN receipt_checksum text`);
  await ignoreDuplicate(`CREATE UNIQUE INDEX IF NOT EXISTS orders_public_token_hash_uidx ON orders(public_token_hash)`);
  await ignoreDuplicate(`ALTER TABLE branches ADD COLUMN next_order_number integer NOT NULL DEFAULT 1001`);
  await ignoreDuplicate(`ALTER TABLE orders ADD COLUMN idempotency_key text`);
  await ignoreDuplicate(`ALTER TABLE orders ADD COLUMN cancel_reason text`);
  await ignoreDuplicate(`CREATE UNIQUE INDEX IF NOT EXISTS orders_branch_idempotency_uidx ON orders(branch_id, idempotency_key)`);
  // Keep the per-branch counter ahead of any existing order number (idempotent).
  await db.execute(
    sql.raw(`UPDATE branches SET next_order_number = GREATEST(next_order_number, COALESCE((SELECT max(order_number) + 1 FROM orders WHERE orders.branch_id = branches.id), 1001))`)
  );

  async function ignoreDuplicate(statement: string) {
    try {
      await exec(statement);
    } catch (error) {
      const message = [
        error instanceof Error ? error.message : String(error),
        error && typeof error === "object" && "cause" in error ? String(error.cause) : ""
      ].join("\n");
      if (!message.includes("already exists")) throw error;
    }
  }
}
