import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

// Uploaded images (menu photos and payment receipts) live in the database, so they survive
// redeploys and restarts on hosts whose disk is wiped, and need no separate storage service.
const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

export const uploads = pgTable(
  "uploads",
  {
    storageKey: text("storage_key").primaryKey(),
    folder: text("folder").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    bytes: bytea("bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [index("uploads_folder_idx").on(table.folder)]
);

export const userRole = pgEnum("user_role", ["owner", "manager", "staff"]);
export const orderStatus = pgEnum("order_status", [
  "new",
  "accepted",
  "preparing",
  "ready",
  "completed",
  "cancelled"
]);

export type OrderLineItem = {
  menuItemId: string;
  name: string;
  nameAr?: string;
  quantity: number;
  unitCents: number;
  selectedVariant: { id: string; name: string; nameAr?: string; priceDelta: number } | null;
  selectedAddOns: Array<{ id: string; name: string; nameAr?: string; priceCents: number }>;
};

export const businesses = pgTable("businesses", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const branches = pgTable(
  "branches",
  {
    id: uuid("id").primaryKey(),
    businessId: uuid("business_id").references(() => businesses.id, { onDelete: "cascade" }).notNull(),
    name: text("name").notNull(),
    nameAr: text("name_ar"),
    slug: text("slug").notNull().unique(),
    address: text("address").notNull(),
    phone: text("phone").notNull(),
    currency: text("currency").default("ILS").notNull(),
    isOpen: boolean("is_open").default(true).notNull(),
    nextOrderNumber: integer("next_order_number").default(1001).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [index("branches_business_id_idx").on(table.businessId)]
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    businessId: uuid("business_id").references(() => businesses.id, { onDelete: "cascade" }).notNull(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").default("staff").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [index("users_business_id_idx").on(table.businessId)]
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey(),
    businessId: uuid("business_id").references(() => businesses.id, { onDelete: "cascade" }).notNull(),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "cascade" }).notNull(),
    nameEn: text("name_en").notNull(),
    nameAr: text("name_ar").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull()
  },
  (table) => [
    index("categories_business_id_idx").on(table.businessId),
    index("categories_branch_sort_idx").on(table.branchId, table.sortOrder)
  ]
);

export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid("id").primaryKey(),
    businessId: uuid("business_id").references(() => businesses.id, { onDelete: "cascade" }).notNull(),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "cascade" }).notNull(),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "cascade" }).notNull(),
    nameEn: text("name_en").notNull(),
    nameAr: text("name_ar").notNull(),
    description: text("description").notNull(),
    descriptionAr: text("description_ar"),
    imageUrl: text("image_url").notNull(),
    priceCents: integer("price_cents").notNull(),
    isAvailable: boolean("is_available").default(true).notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    labels: text("labels").default("").notNull(),
    sortOrder: integer("sort_order").default(0).notNull()
  },
  (table) => [
    index("menu_items_business_id_idx").on(table.businessId),
    index("menu_items_branch_category_sort_idx").on(table.branchId, table.categoryId, table.sortOrder)
  ]
);

export const itemVariants = pgTable(
  "item_variants",
  {
    id: uuid("id").primaryKey(),
    menuItemId: uuid("menu_item_id").references(() => menuItems.id, { onDelete: "cascade" }).notNull(),
    name: text("name").notNull(),
    nameAr: text("name_ar"),
    priceDelta: integer("price_delta").default(0).notNull(),
    sortOrder: integer("sort_order").default(0).notNull()
  },
  (table) => [index("item_variants_menu_item_id_idx").on(table.menuItemId)]
);

export const itemAddOns = pgTable(
  "item_add_ons",
  {
    id: uuid("id").primaryKey(),
    menuItemId: uuid("menu_item_id").references(() => menuItems.id, { onDelete: "cascade" }).notNull(),
    name: text("name").notNull(),
    nameAr: text("name_ar"),
    priceCents: integer("price_cents").default(0).notNull(),
    sortOrder: integer("sort_order").default(0).notNull()
  },
  (table) => [index("item_add_ons_menu_item_id_idx").on(table.menuItemId)]
);

export const paymentMethods = pgTable(
  "payment_methods",
  {
    id: uuid("id").primaryKey(),
    businessId: uuid("business_id").references(() => businesses.id, { onDelete: "cascade" }).notNull(),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "cascade" }).notNull(),
    label: text("label").notNull(),
    labelAr: text("label_ar"),
    type: text("type").notNull(),
    accountName: text("account_name").notNull(),
    phone: text("phone").notNull(),
    details: text("details").notNull(),
    detailsAr: text("details_ar"),
    isDefault: boolean("is_default").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull()
  },
  (table) => [
    index("payment_methods_business_id_idx").on(table.businessId),
    index("payment_methods_branch_id_idx").on(table.branchId)
  ]
);

export const qrCodes = pgTable(
  "qr_codes",
  {
    id: uuid("id").primaryKey(),
    businessId: uuid("business_id").references(() => businesses.id, { onDelete: "cascade" }).notNull(),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "cascade" }).notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    label: text("label").notNull(),
    tableLabel: text("table_label"),
    kind: text("kind").default("branch").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("qr_codes_business_id_idx").on(table.businessId),
    index("qr_codes_branch_id_idx").on(table.branchId)
  ]
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey(),
    businessId: uuid("business_id").references(() => businesses.id, { onDelete: "cascade" }).notNull(),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "cascade" }).notNull(),
    orderNumber: integer("order_number").notNull(),
    status: orderStatus("status").default("new").notNull(),
    publicTokenHash: text("public_token_hash").notNull().unique(),
    paymentStatus: text("payment_status").default("pending_review").notNull(),
    qrCodeId: uuid("qr_code_id").references(() => qrCodes.id),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    tableLabel: text("table_label"),
    note: text("note"),
    totalCents: integer("total_cents").notNull(),
    paymentMethodId: uuid("payment_method_id").references(() => paymentMethods.id).notNull(),
    paymentMethodLabel: text("payment_method_label").notNull(),
    paymentMethodLabelAr: text("payment_method_label_ar"),
    transferFromPhone: text("transfer_from_phone").notNull(),
    transferReference: text("transfer_reference").notNull(),
    receiptStorageKey: text("receipt_storage_key"),
    receiptOriginalName: text("receipt_original_name"),
    receiptMimeType: text("receipt_mime_type"),
    receiptSize: integer("receipt_size"),
    receiptChecksum: text("receipt_checksum"),
    idempotencyKey: text("idempotency_key"),
    cancelReason: text("cancel_reason"),
    lineItems: jsonb("line_items").$type<OrderLineItem[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("orders_business_id_idx").on(table.businessId),
    index("orders_branch_status_idx").on(table.branchId, table.status, table.createdAt),
    uniqueIndex("orders_branch_order_number_uidx").on(table.branchId, table.orderNumber),
    uniqueIndex("orders_branch_idempotency_uidx").on(table.branchId, table.idempotencyKey)
  ]
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey(),
    businessId: uuid("business_id").references(() => businesses.id, { onDelete: "cascade" }).notNull(),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("audit_logs_business_id_idx").on(table.businessId),
    index("audit_logs_branch_id_idx").on(table.branchId)
  ]
);

// Request counters for the rate limiter when several app instances share one Postgres.
// (Embedded PGlite uses an in-process counter instead.)
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull(),
    resetAt: timestamp("reset_at", { withTimezone: true }).notNull()
  },
  (table) => [index("rate_limits_reset_at_idx").on(table.resetAt)]
);

export type UserRole = (typeof userRole.enumValues)[number];
export type OrderStatus = (typeof orderStatus.enumValues)[number];
