import { strict as assert } from "node:assert";

// Runs on in-memory PGlite. Set TEST_DATABASE_URL to a migrated, empty Postgres database to run
// the same checks against real Postgres (see scripts/postgres-test.ts).
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
} else {
  process.env.PGLITE_DATA_DIR = "memory://";
  delete process.env.DATABASE_URL;
}

const {
  authenticateUser,
  canMoveTo,
  createOrder,
  createStaff,
  getAuditLogsForBusiness,
  getDefaultBranchSlug,
  getFirstBranchForBusiness,
  getOrders,
  getPublicMenu,
  getPublicMenuByQrToken,
  getPublicOrderProgress,
  createCategory,
  createTableQrs,
  deleteItem,
  getMenuAdmin,
  getQrTokenById,
  getQrTokenForBranch,
  getSettings,
  initializeAndSeed,
  findUserByEmail,
  listQrCodes,
  listStaff,
  passwordStamp,
  resolveQrToken,
  saveItem,
  savePaymentMethod,
  setTableQrActive,
  toggleItemAvailability,
  updateBranch,
  updateOrder,
  updateStaff,
  validateSessionUser
} = await import("../src/server/store");
const { getDb } = await import("../src/db/client");
const { businesses, users } = await import("../src/db/schema");
const { staffCreateSchema, staffUpdateSchema } = await import("../lib/schemas");
const { publish } = await import("../lib/events");

await initializeAndSeed();

const menu = await getPublicMenu("demo-cafe");
assert.ok(menu, "public menu should load");
assert.equal(menu.branch.slug, "demo-cafe");
assert.ok(menu.categories.length >= 3, "seed should create categories");
const cash = menu.paymentMethods.find((method) => method.type === "cash_or_card");
const bank = menu.paymentMethods.find((method) => method.type === "bank");
assert.ok(cash && bank, "seed should create cash and bank payment methods");

// --- phone numbers: any spelling becomes 10 plain digits starting with 05
const { normalizeMobile, formatMobile } = await import("../lib/phone");
assert.equal(normalizeMobile("+970591234567"), "0591234567");
assert.equal(normalizeMobile("+970 59 123 4567"), "0591234567");
assert.equal(normalizeMobile("059-123-4567"), "0591234567");
assert.equal(normalizeMobile("12345"), null);
assert.equal(formatMobile("0591234567"), "059-123-4567");

// --- uploaded images live in the database, per folder
const { saveReceipt, readReceipt, deleteReceipt } = await import("../lib/receipts");
const photo = await saveReceipt(new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], "t.jpg", { type: "image/jpeg" }), "media");
const stored = await readReceipt(photo.storageKey, "media");
assert.ok(stored && stored.bytes.length === 7 && stored.mimeType === "image/jpeg", "a saved image reads back unchanged");
assert.equal(await readReceipt(photo.storageKey, "receipts"), null, "a public photo is not readable as a private receipt");
await deleteReceipt(photo.storageKey, "media");
assert.equal(await readReceipt(photo.storageKey, "media"), null, "a deleted image is gone");
await assert.rejects(saveReceipt(new File([new Uint8Array([1, 2, 3, 4])], "x.jpg", { type: "image/jpeg" })), "bytes that are not an image are refused");

// --- QR tokens
const qrToken = await getQrTokenForBranch("demo-cafe");
assert.ok(qrToken, "branch should have a QR token");
assert.ok(!qrToken.includes("demo"), "QR token must not be a hard-coded demo value");
assert.equal(await getQrTokenForBranch("demo-cafe"), qrToken, "QR token must be stable");
assert.equal(await getQrTokenForBranch("no-such-branch"), null, "unknown branch has no QR token");
assert.ok(await getPublicMenuByQrToken(qrToken), "secure QR token should resolve public menu");
assert.equal(await resolveQrToken("fd_demo_9cc38ef8c08c4fbfa3e4572d1c7edb1f"), null, "old public demo token must not resolve");
assert.match(qrToken, /^[0-9a-hjkmnp-tv-z]{4}-[0-9a-hjkmnp-tv-z]{4}-[0-9a-hjkmnp-tv-z]{4}$/, "QR code is a short grouped code like k7q3-xm9d-4trb");
assert.ok(await getPublicMenuByQrToken(qrToken.toUpperCase().replaceAll("-", " ")), "a typed code (any case, spaces) still resolves");
assert.equal(await getDefaultBranchSlug(), "demo-cafe", "the plain address serves the oldest branch");
assert.ok(menu.popularIds.length > 0 && menu.popularIds.length <= 6, "home carousel has items to show");

// --- fixtures
const products = menu.categories.flatMap((category) => category.products);
const latte = products.find((product) => product.nameEn === "Pistachio Latte");
const cake = products.find((product) => product.nameEn === "Honey Cake Slice");
assert.ok(latte && cake, "seed products exist");
const large = latte.variants.find((variant) => variant.name === "Large");
const oat = latte.addOns.find((addOn) => addOn.name === "Oat milk");
assert.ok(large && oat, "seed options exist");

let receiptCounter = 0;
const receipt = () => ({
  storageKey: `00000000-0000-0000-0000-00000000000${receiptCounter}.jpg`,
  originalName: "r.jpg",
  mimeType: "image/jpeg",
  size: 10,
  checksum: `checksum-${receiptCounter}`
});
const base = { branchSlug: "demo-cafe", qrToken, firstName: "Test", lastName: "Customer", customerPhone: "+970599111111", note: null };
const cashOrder = (items: Parameters<typeof createOrder>[0]["items"], extra: Partial<Parameters<typeof createOrder>[0]> = {}) =>
  createOrder({ ...base, paymentMethodId: cash.id, items, ...extra });

function created(result: Awaited<ReturnType<typeof createOrder>>) {
  if ("error" in result) throw new Error(`order should be created: ${result.error}`);
  return result;
}

// --- pricing and names come from the server
const first = created(await cashOrder([{ productId: latte.id, variantId: large.id, addOnIds: [oat.id], quantity: 2 }], { tableLabel: "Table 7" }));
assert.equal(first.order.status, "new");
assert.equal(first.order.paymentStatus, "pay_at_counter");
assert.equal(first.order.totalCents, (latte.priceCents + large.priceDelta + oat.priceCents) * 2, "total is computed on the server");
assert.equal(first.order.lineItems[0].name, "Pistachio Latte", "ticket name comes from the database");
assert.equal(first.order.lineItems[0].selectedVariant?.name, "Large");
assert.equal(first.order.tableLabel, "Table 7");
assert.equal(first.order.paymentMethodLabelAr, "الدفع عند الطاولة أو الكاونتر", "Arabic payment label is stored with the order");
assert.equal(first.order.lineItems[0].selectedVariant?.nameAr, "كبير", "Arabic option names are stored with the order");
assert.equal(first.order.lineItems[0].selectedAddOns[0]?.nameAr, "حليب الشوفان");
assert.equal(first.order.orderNumber, 1001);

const defaultVariant = created(await cashOrder([{ productId: latte.id, addOnIds: [], quantity: 1 }]));
assert.equal(defaultVariant.order.lineItems[0].selectedVariant?.name, "Regular", "no variant picks the first one");

// --- bad options and unavailable items are rejected
const unknownVariant = await cashOrder([{ productId: latte.id, variantId: "00000000-0000-0000-0000-000000000000", addOnIds: [], quantity: 1 }]);
assert.ok("error" in unknownVariant && unknownVariant.status === 400, "unknown variant id is rejected");
const foreignAddOn = await cashOrder([{ productId: cake.id, addOnIds: [oat.id], quantity: 1 }]);
assert.ok("error" in foreignAddOn && foreignAddOn.status === 400, "add-on of another product is rejected");
const businessId = first.order.businessId;
await toggleItemAvailability(cake.id, businessId, false);
const soldOut = await cashOrder([{ productId: cake.id, addOnIds: [], quantity: 1 }]);
assert.ok("error" in soldOut && soldOut.status === 409, "unavailable item is rejected");
await toggleItemAvailability(cake.id, businessId, true);

// --- idempotent retry returns the same order
const key = "11111111-1111-4111-8111-111111111111";
const once = created(await cashOrder([{ productId: cake.id, addOnIds: [], quantity: 1 }], { idempotencyKey: key }));
const again = created(await cashOrder([{ productId: cake.id, addOnIds: [], quantity: 1 }], { idempotencyKey: key }));
assert.equal(again.order.id, once.order.id, "replay returns the original order");
assert.equal(again.trackingToken, once.trackingToken, "replay returns the same tracking link");
assert.equal(again.replayed, true);
assert.equal(once.replayed, false);

// --- concurrent orders never share a number
const burst = await Promise.all(Array.from({ length: 8 }, () => cashOrder([{ productId: cake.id, addOnIds: [], quantity: 1 }])));
const numbers = burst.map((result) => created(result).order.orderNumber);
assert.equal(new Set(numbers).size, 8, `order numbers must be unique, got ${numbers.join(",")}`);

// --- transfer orders need a receipt, and a receipt cannot be reused
const bankBase = { paymentMethodId: bank.id, transferFromPhone: "0599", transferReference: "REF-1" };
const noProof = await createOrder({ ...base, paymentMethodId: bank.id, transferFromPhone: "0599111111", items: [{ productId: cake.id, addOnIds: [], quantity: 1 }] });
assert.ok("error" in noProof && noProof.status === 400, "bank order with neither an operation number nor a receipt is rejected");
receiptCounter = 1;
const paid = created(await createOrder({ ...base, ...bankBase, receipt: receipt(), items: [{ productId: cake.id, addOnIds: [], quantity: 1 }] }));
assert.equal(paid.order.paymentStatus, "pending_review");
receiptCounter = 1;
const reused = await createOrder({ ...base, ...bankBase, transferReference: "REF-OTHER", receipt: receipt(), items: [{ productId: cake.id, addOnIds: [], quantity: 1 }] });
assert.ok("error" in reused && reused.status === 409, "reused receipt image is rejected");

// --- status rules
const blocked = await updateOrder(paid.order.id, businessId, { status: "accepted" });
assert.ok("error" in blocked && blocked.status === 409, "cannot accept before the payment is verified");
const verified = await updateOrder(paid.order.id, businessId, { paymentStatus: "verified" });
assert.ok(verified.order?.paymentStatus === "verified");
const twice = await updateOrder(paid.order.id, businessId, { paymentStatus: "rejected" });
assert.ok("error" in twice && twice.status === 409, "payment can only be reviewed once");
for (const status of ["accepted", "preparing", "ready"] as const) {
  const step = await updateOrder(paid.order.id, businessId, { status });
  assert.ok(step.order?.status === status, `moves to ${status}`);
}
assert.equal((await getPublicOrderProgress(paid.trackingToken))?.progress, "ready", "customer sees ready");
assert.equal((await getPublicOrderProgress(paid.trackingToken))?.branchSlug, "demo-cafe");
const backwards = await updateOrder(paid.order.id, businessId, { status: "accepted" });
assert.ok("error" in backwards && backwards.status === 409, "status cannot go backwards");
const done = await updateOrder(paid.order.id, businessId, { status: "completed" });
assert.ok(done.order?.status === "completed");
const reopen = await updateOrder(paid.order.id, businessId, { status: "cancelled" });
assert.ok("error" in reopen, "a completed order cannot be cancelled");
assert.ok(!canMoveTo("cancelled", "accepted") && canMoveTo("new", "ready") && canMoveTo("preparing", "cancelled"));

// --- rejecting a payment cancels the order and frees the receipt
receiptCounter = 2;
const toReject = created(await createOrder({ ...base, ...bankBase, transferReference: "REF-2", receipt: receipt(), items: [{ productId: cake.id, addOnIds: [], quantity: 1 }] }));
const rejected = await updateOrder(toReject.order.id, businessId, { paymentStatus: "rejected", cancelReason: "Amount too low" });
assert.ok(rejected.order?.status === "cancelled" && rejected.order.cancelReason === "Amount too low");
const progress = await getPublicOrderProgress(toReject.trackingToken);
assert.equal(progress?.progress, "cancelled");
assert.equal(progress?.cancelReason, "Amount too low");
receiptCounter = 2;
created(await createOrder({ ...base, ...bankBase, transferReference: "REF-2", receipt: receipt(), items: [{ productId: cake.id, addOnIds: [], quantity: 1 }] }));

// --- tenant isolation
const otherTenant = await updateOrder(first.order.id, "00000000-0000-0000-0000-000000000000", { status: "accepted" });
assert.ok("error" in otherTenant && otherTenant.status === 404, "cross-tenant update must be blocked");

const branch = await getFirstBranchForBusiness(businessId);
assert.ok(branch, "tenant branch should resolve");
const allOrders = await getOrders(branch.id, businessId);
assert.ok(allOrders.length >= 12);

const logs = await getAuditLogsForBusiness(businessId);
assert.ok(logs.some((log) => log.action === "order.created"), "order creation should be audited");
assert.ok(logs.some((log) => log.action === "order.updated"), "status update should be audited");

// --- live updates: creating and updating an order notifies the business channel
let pings = 0;
const bus = (globalThis as unknown as { fineDineBus: { on(channel: string, listener: () => void): void } }).fineDineBus;
bus.on(`business:${businessId}`, () => pings++);
const ping = created(await cashOrder([{ productId: cake.id, addOnIds: [], quantity: 1 }]));
await updateOrder(ping.order.id, businessId, { status: "accepted" });
// Live updates arrive through Postgres NOTIFY there, so give them a moment.
for (let waited = 0; pings < 2 && waited < 3000; waited += 25) await new Promise((resolve) => setTimeout(resolve, 25));
assert.equal(pings, 2, "order created and updated both publish a change");
publish("nobody-listens");

// --- menu editor: create, edit options in place, delete
const admin = await getMenuAdmin(businessId);
assert.ok(admin && admin.categories.length >= 3);
const extra = await createCategory(businessId, { nameEn: "Specials", nameAr: "خاص" });
if (!extra) throw new Error("category should be created");
const made = await saveItem(businessId, {
  categoryId: extra.id, nameEn: "Test Tea", nameAr: "شاي", description: "", imageUrl: "", priceCents: 700, labels: "hot",
  variants: [{ name: "Small", priceDelta: 0 }, { name: "Big", priceDelta: 200 }],
  addOns: [{ name: "Mint", priceCents: 100 }]
});
if (!("id" in made)) throw new Error("item should be created");
const madeId = made.id as string;
const after = await getMenuAdmin(businessId);
const tea = after?.categories.find((category) => category.id === extra.id)?.items[0];
assert.equal(tea?.variants.length, 2);
assert.equal(tea?.addOns[0].name, "Mint");
const keepVariant = tea.variants[0];
const edited = await saveItem(
  businessId,
  { categoryId: extra.id, nameEn: "Test Tea", nameAr: "شاي", description: "x", imageUrl: "", priceCents: 800, variants: [{ id: keepVariant.id, name: "Mini", priceDelta: 0 }], addOns: [] },
  madeId
);
assert.ok("id" in edited, "item is edited");
const tea2 = (await getMenuAdmin(businessId))?.categories.find((category) => category.id === extra.id)?.items[0];
assert.equal(tea2?.variants.length, 1, "removed variant is gone");
assert.equal(tea2?.variants[0].id, keepVariant.id, "kept variant keeps its id");
assert.equal(tea2?.variants[0].name, "Mini");
assert.equal(tea2?.addOns.length, 0);
assert.equal(tea2?.priceCents, 800);
const wrongTenantItem = await saveItem("00000000-0000-0000-0000-000000000000", { categoryId: extra.id, nameEn: "x", nameAr: "", description: "", imageUrl: "", priceCents: 1, variants: [], addOns: [] });
assert.ok("error" in wrongTenantItem, "cannot add items to another tenant's category");
const teaOrder = created(await cashOrder([{ productId: madeId, addOnIds: [], quantity: 1 }]));
assert.equal(teaOrder.order.totalCents, 800);
assert.equal(await deleteItem(businessId, madeId), true);
assert.equal(await deleteItem(businessId, madeId), false);
assert.equal((await getOrders(branch.id, businessId)).find((row) => row.id === teaOrder.order.id)?.lineItems[0].name, "Test Tea", "old orders survive item deletion");

// --- tables: each table has its own QR and orders get the table name from it
const tables = await createTableQrs(businessId, ["Table 1", "table 1", "Terrace"]);
assert.equal(tables?.length, 2, "duplicate table names are skipped");
assert.equal((await createTableQrs(businessId, ["TABLE 1"]))?.length, 0, "existing table is not created twice");
const table1 = (await listQrCodes(businessId)).find((code) => code.tableLabel === "Table 1");
assert.ok(table1);
const table1Token = await getQrTokenById(businessId, table1.id);
assert.ok(table1Token && table1Token !== qrToken, "table QR has its own token");
assert.equal(await getQrTokenById("00000000-0000-0000-0000-000000000000", table1.id), null, "token is tenant-scoped");
const tableOrder = created(await createOrder({ ...base, qrToken: table1Token, tableLabel: null, paymentMethodId: cash.id, items: [{ productId: cake.id, addOnIds: [], quantity: 1 }] }));
assert.equal(tableOrder.order.tableLabel, "Table 1", "table comes from the QR code");
await setTableQrActive(businessId, table1.id, false);
assert.equal(await resolveQrToken(table1Token), null, "disabled table QR stops working");

// --- settings: closing the shop stops orders, one default payment method
assert.ok((await updateBranch(businessId, { isOpen: false }))?.isOpen === false);
const closed = await cashOrder([{ productId: cake.id, addOnIds: [], quantity: 1 }]);
assert.ok("error" in closed && closed.status === 404, "closed shop takes no orders");
assert.ok(await getPublicMenu("demo-cafe"), "closed shop still shows its menu");
await updateBranch(businessId, { isOpen: true });
const wallet = await savePaymentMethod(businessId, { label: "New wallet", type: "digital_wallet", isDefault: true });
const settings = await getSettings(businessId);
assert.equal(settings?.paymentMethods.filter((method) => method.isDefault).length, 1, "only one default method");
assert.equal(settings?.paymentMethods.find((method) => method.isDefault)?.id, wallet?.id);
await savePaymentMethod(businessId, { isActive: false }, wallet?.id);
assert.equal((await getPublicMenu("demo-cafe"))?.paymentMethods.some((method) => method.id === wallet?.id), false, "inactive methods are hidden from customers");

// --- staff accounts: create, disable, reset password, tenant scoping
const owner = await findUserByEmail("owner@finedine.local");
assert.ok(owner && owner.isActive && owner.role === "owner", "seeded owner is active");
const ownerStamp = passwordStamp(owner.passwordHash);
assert.ok(await validateSessionUser(owner.id, businessId, ownerStamp), "owner session is valid");

assert.ok(!staffCreateSchema.safeParse({ email: "a@b.co", name: "A", role: "staff", password: "short" }).success, "short passwords are rejected");
assert.ok(!staffCreateSchema.safeParse({ email: "a@b.co", name: "A", role: "admin", password: "long-enough-password" }).success, "unknown role is rejected");
assert.ok(!staffUpdateSchema.safeParse({}).success, "empty update is rejected");
assert.equal(staffCreateSchema.parse({ email: " Cook@Example.COM ", name: " Cook ", role: "staff", password: "long-enough-password" }).email, "cook@example.com");

const cook = await createStaff(businessId, owner.id, { email: "Cook@Example.com", name: "Cook", role: "staff", password: "first-password-123" });
if ("error" in cook) throw new Error(`staff should be created: ${cook.error}`);
assert.equal(cook.user.email, "cook@example.com", "email is stored in lower case");
assert.ok(!("passwordHash" in cook.user), "password hash is never returned");
const dupe = await createStaff(businessId, owner.id, { email: "COOK@example.com", name: "Again", role: "manager", password: "first-password-123" });
assert.ok("error" in dupe && dupe.status === 409, "duplicate email is rejected");
assert.ok(await authenticateUser("cook@example.com", "first-password-123"), "new account can sign in");
assert.equal(await authenticateUser("cook@example.com", "wrong-password-123"), null, "wrong password is rejected");
const cookRow = await findUserByEmail("cook@example.com");
if (!cookRow) throw new Error("cook exists");
assert.ok(await validateSessionUser(cook.user.id, businessId, passwordStamp(cookRow.passwordHash)));
assert.equal(await validateSessionUser(cook.user.id, businessId, undefined), null, "token without a password stamp is rejected");
assert.equal(await validateSessionUser(cook.user.id, "00000000-0000-0000-0000-000000000000", passwordStamp(cookRow.passwordHash)), null, "session is bound to its business");

const staffList = await listStaff(businessId);
assert.deepEqual(staffList.map((user) => user.email).sort(), ["cook@example.com", "owner@finedine.local"]);
assert.ok(staffList.every((user) => !("passwordHash" in user)), "list has no password hashes");

// an owner cannot lock themselves out
const selfDisable = await updateStaff(businessId, owner.id, owner.id, { isActive: false });
assert.ok("error" in selfDisable && selfDisable.status === 409, "owner cannot disable themselves");
const selfDemote = await updateStaff(businessId, owner.id, owner.id, { role: "staff" });
assert.ok("error" in selfDemote && selfDemote.status === 409, "owner cannot change their own role");
assert.equal((await findUserByEmail("owner@finedine.local"))?.isActive, true);

// another tenant's user is invisible and untouchable
const [otherBusiness] = await getDb().insert(businesses).values({ id: "00000000-0000-4000-8000-0000000000b1", name: "Other", slug: "other-co" }).returning();
const [outsider] = await getDb().insert(users).values({ id: "00000000-0000-4000-8000-0000000000c1", businessId: otherBusiness.id, email: "out@other.co", name: "Out", passwordHash: "x", role: "owner" }).returning();
assert.ok(!(await listStaff(businessId)).some((user) => user.id === outsider.id), "other tenant's users are not listed");
const crossTenant = await updateStaff(businessId, owner.id, outsider.id, { isActive: false });
assert.ok("error" in crossTenant && crossTenant.status === 404, "cannot update another tenant's user");
assert.equal((await findUserByEmail("out@other.co"))?.isActive, true, "other tenant's user untouched");
assert.equal((await listStaff(otherBusiness.id)).length, 1);

// reset password: old password and old sessions stop working
const reset = await updateStaff(businessId, owner.id, cook.user.id, { password: "second-password-456" });
assert.ok("user" in reset && reset.passwordChanged);
assert.equal(await authenticateUser("cook@example.com", "first-password-123"), null, "old password stops working");
assert.ok(await authenticateUser("cook@example.com", "second-password-456"), "new password works");
assert.equal(await validateSessionUser(cook.user.id, businessId, passwordStamp(cookRow.passwordHash)), null, "old session dies after a password reset");

// role change applies to live sessions
const promoted = await updateStaff(businessId, owner.id, cook.user.id, { role: "manager", name: "Head cook" });
if ("error" in promoted) throw new Error(promoted.error);
assert.ok(promoted.user.role === "manager" && promoted.user.name === "Head cook");
const cookNow = await findUserByEmail("cook@example.com");
if (!cookNow) throw new Error("cook exists");
assert.equal((await validateSessionUser(cook.user.id, businessId, passwordStamp(cookNow.passwordHash)))?.role, "manager", "session sees the new role");

// disable: no sign-in, live session dies; enable brings the account back
const disabled = await updateStaff(businessId, owner.id, cook.user.id, { isActive: false });
if ("error" in disabled) throw new Error(disabled.error);
assert.equal(disabled.user.isActive, false);
assert.equal(await authenticateUser("cook@example.com", "second-password-456"), null, "disabled user cannot sign in");
assert.equal(await validateSessionUser(cook.user.id, businessId, passwordStamp(cookNow.passwordHash)), null, "disabled user's session is rejected");
await updateStaff(businessId, owner.id, cook.user.id, { isActive: true });
assert.ok(await authenticateUser("cook@example.com", "second-password-456"), "enabled user can sign in again");

const staffLogs = (await getAuditLogsForBusiness(businessId)).filter((log) => log.action.startsWith("staff."));
assert.ok(staffLogs.some((log) => log.action === "staff.created") && staffLogs.some((log) => log.action === "staff.updated"), "staff changes are audited");
assert.ok(!JSON.stringify(staffLogs).includes("password-"), "audit log never holds passwords");

// --- Arabic fields reach the customer menu; empty ones fall back to English in the UI
const arMenu = await getPublicMenu("demo-cafe");
assert.equal(arMenu?.branch.nameAr, "الفرع الرئيسي");
const arLatte = arMenu?.categories.flatMap((category) => category.products).find((product) => product.nameEn === "Pistachio Latte");
assert.ok(arLatte?.descriptionAr, "seed item has an Arabic description");
assert.equal(arLatte?.variants.find((variant) => variant.name === "Large")?.nameAr, "كبير");
assert.ok(arMenu?.paymentMethods.some((method) => method.labelAr === "محفظة بال باي"), "PalPay wallet is offered");
assert.ok(arMenu?.paymentMethods.some((method) => method.labelAr === "جوال باي") && arMenu.paymentMethods.some((method) => method.type === "bank"));
assert.ok(!arMenu?.paymentMethods.some((method) => /card/i.test(method.label) && !/cash/i.test(method.label)), "no card-only payment method");
const withArabic = await saveItem(businessId, {
  categoryId: extra.id, nameEn: "Mint Tea", nameAr: "شاي بالنعناع", description: "Fresh mint", descriptionAr: "نعناع طازج", imageUrl: "", priceCents: 600,
  variants: [{ name: "Cup", nameAr: "كوب", priceDelta: 0 }], addOns: [{ name: "Honey", nameAr: "عسل", priceCents: 100 }]
});
assert.ok("id" in withArabic);
const mintTea = (await getMenuAdmin(businessId))?.categories.find((category) => category.id === extra.id)?.items.find((item) => item.nameEn === "Mint Tea");
assert.equal(mintTea?.descriptionAr, "نعناع طازج");
assert.equal(mintTea?.variants[0].nameAr, "كوب");
assert.equal(mintTea?.addOns[0].nameAr, "عسل");
const noArabic = await saveItem(businessId, {
  categoryId: extra.id, nameEn: "Plain Tea", nameAr: "", description: "Tea", descriptionAr: "  ", imageUrl: "", priceCents: 500, variants: [], addOns: []
});
assert.ok("id" in noArabic);
const plainTea = (await getMenuAdmin(businessId))?.categories.find((category) => category.id === extra.id)?.items.find((item) => item.nameEn === "Plain Tea");
assert.equal(plainTea?.descriptionAr, null, "blank Arabic text is stored as empty so the UI falls back to English");

console.log("integration ok", { orders: allOrders.length, auditEvents: logs.length });
// Open Postgres connections (pool and LISTEN) would otherwise keep the process alive.
process.exit(0);
