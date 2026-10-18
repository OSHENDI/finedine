import bcrypt from "bcryptjs";
import { and, asc, count, desc, eq, gte, inArray, ne, or, sql } from "drizzle-orm";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { publish } from "@/lib/events";
import { getDb } from "@/src/db/client";
import { ensureDatabase } from "@/src/db/init";
import {
  auditLogs,
  branches,
  businesses,
  categories,
  itemAddOns,
  itemVariants,
  menuItems,
  orders,
  paymentMethods,
  qrCodes,
  users,
  type OrderLineItem,
  type OrderStatus,
  type UserRole
} from "@/src/db/schema";
import type { AddOnView, BranchView, CategoryView, PaymentMethodView, ProductView, VariantView } from "@/types/menu";

const image = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;
const uuid = () => randomUUID();
const globalForInit = globalThis as unknown as { initPromise?: Promise<void> };

function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

// QR tokens are derived from the QR row id with an HMAC, so the printable token
// can be rebuilt on demand while the database only holds its SHA-256 hash.
// Changing QR_TOKEN_SECRET (or AUTH_SECRET when it is not set) invalidates printed codes.
function derivedBytes(prefix: string, id: string) {
  const key = process.env.QR_TOKEN_SECRET || process.env.AUTH_SECRET;
  // Only a local run (development, test, or scripts with no NODE_ENV) may use the built-in key.
  const local = !process.env.NODE_ENV || process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
  if (!local && (!key || key.length < 32)) {
    throw new Error("QR_TOKEN_SECRET or AUTH_SECRET (32+ characters) is required in production");
  }
  return createHmac("sha256", key ?? "dev-only-qr-secret").update(`${prefix}:${id}`).digest();
}

function derivedToken(prefix: string, id: string) {
  return `${prefix}_${derivedBytes(prefix, id).toString("base64url")}`;
}

// Table codes are short enough to print under the QR and to type by hand: 12 characters of
// Crockford base32 (no i, l, o, u), 60 bits from the HMAC, shown as "k7q3-xm9d-4trb".
const CODE_ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";
const groupCode = (chars: string) => `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;

function deriveQrToken(qrId: string) {
  const bytes = derivedBytes("fd", qrId);
  let chars = "";
  for (let index = 0; index < 12; index++) chars += CODE_ALPHABET[bytes[index] & 31];
  return groupCode(chars);
}

// Accepts what a person might type: any case, spaces or dashes, and the look-alike letters.
export function normalizeQrCode(input: string) {
  const chars = input.toLowerCase().replace(/[^0-9a-z]/g, "").replace(/[il]/g, "1").replace(/o/g, "0");
  return chars.length === 12 ? groupCode(chars) : input;
}
// Derived (not random) so a retried order submit can return the same tracking link.
const deriveOrderToken = (orderId: string) => derivedToken("ord", orderId);

export async function initializeAndSeed() {
  if (!globalForInit.initPromise) {
    // Do not cache a failure: a brief DB outage at startup must not break the process forever.
    globalForInit.initPromise = runInitAndSeed().catch((error) => {
      globalForInit.initPromise = undefined;
      throw error;
    });
  }
  return globalForInit.initPromise;
}

async function runInitAndSeed() {
  await ensureDatabase();
  const db = getDb();
  const existing = await db.select({ id: businesses.id }).from(businesses).limit(1);
  if (existing.length > 0) return;

  // Demo credentials exist only outside production. In production the first owner
  // must be provided explicitly through ADMIN_EMAIL and ADMIN_PASSWORD.
  const isProduction = process.env.NODE_ENV === "production";
  const ownerEmail = (process.env.ADMIN_EMAIL ?? (isProduction ? "" : "owner@finedine.local")).trim().toLowerCase();
  const ownerPassword = process.env.ADMIN_PASSWORD ?? (isProduction ? "" : "FineDine123!");
  if (isProduction && (!ownerEmail || ownerPassword.length < 12)) {
    console.warn("[finedine] Empty database and no seed: set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) to create the first owner.");
    return;
  }

  const businessId = uuid();
  const branchId = uuid();
  const ownerId = uuid();
  const qrId = uuid();
  const coffeeId = uuid();
  const sweetsId = uuid();
  const juiceCategoryId = uuid();
  const waffleCategoryId = uuid();
  const iceCategoryId = uuid();
  const latteId = uuid();
  const cakeId = uuid();
  const iceCreamId = uuid();
  const juiceId = uuid();

  await db.insert(businesses).values({ id: businessId, name: "FineDine Demo", slug: "finedine-demo" });
  await db.insert(branches).values({
    id: branchId,
    businessId,
    name: "Main Branch",
    nameAr: "الفرع الرئيسي",
    slug: "demo-cafe",
    address: "Ramallah, Palestine",
    phone: "+970 59 900 0000",
    currency: "ILS"
  });
  await db.insert(users).values({
    id: ownerId,
    businessId,
    email: ownerEmail,
    name: "Owner",
    role: "owner",
    passwordHash: await bcrypt.hash(ownerPassword, 12)
  });
  await db.insert(categories).values([
    { id: coffeeId, businessId, branchId, nameEn: "Coffee", nameAr: "القهوة", sortOrder: 1 },
    { id: waffleCategoryId, businessId, branchId, nameEn: "Waffles & Crepes", nameAr: "وافل وكريب", sortOrder: 2 },
    { id: iceCategoryId, businessId, branchId, nameEn: "Ice Cream", nameAr: "آيس كريم", sortOrder: 3 },
    { id: sweetsId, businessId, branchId, nameEn: "Desserts", nameAr: "الحلويات", sortOrder: 4 },
    { id: juiceCategoryId, businessId, branchId, nameEn: "Juices", nameAr: "العصائر", sortOrder: 5 }
  ]);
  await db.insert(qrCodes).values({
    id: qrId,
    businessId,
    branchId,
    tokenHash: hashToken(deriveQrToken(qrId)),
    label: "Main branch QR",
    tableLabel: null,
    kind: "branch"
  });
  await db.insert(paymentMethods).values([
    {
      id: uuid(),
      businessId,
      branchId,
      label: "Pay at Table / Counter",
      type: "cash_or_card",
      accountName: "FineDine Demo",
      phone: "+970 59 900 0000",
      details: "Pay staff at the table or counter when your order is confirmed.",
      labelAr: "الدفع عند الطاولة أو الكاونتر",
      detailsAr: "ادفع للموظف عند الطاولة أو الكاونتر بعد تأكيد طلبك.",
      isDefault: true
    },
    {
      id: uuid(),
      businessId,
      branchId,
      label: "Jawwal Pay",
      labelAr: "جوال باي",
      type: "digital_wallet",
      accountName: "FineDine Demo",
      phone: "+970 59 900 0000",
      details: "Send the exact total, then enter the transfer reference and upload the receipt.",
      detailsAr: "حوّل المبلغ بالضبط، ثم أدخل رقم العملية وارفع صورة الإيصال."
    },
    {
      id: uuid(),
      businessId,
      branchId,
      label: "Bank transfer",
      labelAr: "تحويل بنكي",
      type: "bank",
      accountName: "FineDine Demo",
      phone: "+970 2 000 0000",
      details: "Use your phone number as the transfer note, then upload the receipt.",
      detailsAr: "اكتب رقم هاتفك في ملاحظة التحويل، ثم ارفع صورة الإيصال."
    },
    {
      id: uuid(),
      businessId,
      branchId,
      label: "PalPay wallet",
      labelAr: "محفظة بال باي",
      type: "digital_wallet",
      accountName: "FineDine Demo",
      phone: "+970 59 900 0001",
      details: "Send the exact total from your PalPay wallet, then enter the reference and upload the receipt.",
      detailsAr: "حوّل المبلغ بالضبط من محفظة بال باي، ثم أدخل رقم العملية وارفع صورة الإيصال."
    }
  ]);
  await db.insert(menuItems).values([
    {
      id: latteId,
      businessId,
      branchId,
      categoryId: coffeeId,
      nameEn: "Pistachio Latte",
      nameAr: "لاتيه فستق",
      description: "Espresso, steamed milk, pistachio cream, and a clean nutty finish.",
      descriptionAr: "إسبريسو وحليب مبخّر وكريمة الفستق بنكهة مكسّرات ناعمة.",
      imageUrl: image("photo-1461023058943-07fcbe16d735"),
      priceCents: 1800,
      isFeatured: true,
      labels: "popular,contains nuts",
      sortOrder: 1
    },
    {
      id: cakeId,
      businessId,
      branchId,
      categoryId: sweetsId,
      nameEn: "Honey Cake Slice",
      nameAr: "كيكة العسل",
      description: "Layered sponge cake with cream, honey, and toasted crumbs.",
      descriptionAr: "طبقات كيك إسفنجي مع الكريمة والعسل وفتات محمّص.",
      imageUrl: image("photo-1578985545062-69928b1d9587"),
      priceCents: 2200,
      isFeatured: true,
      labels: "vegetarian",
      sortOrder: 1
    },
    {
      id: iceCreamId,
      businessId,
      branchId,
      categoryId: iceCategoryId,
      nameEn: "Vanilla Ice Cream Cup",
      nameAr: "آيس كريم فانيلا",
      description: "Small-batch vanilla ice cream with optional toppings.",
      descriptionAr: "آيس كريم فانيلا بكميات صغيرة مع إضافات اختيارية.",
      imageUrl: image("photo-1567206563064-6f60f40a2b57"),
      priceCents: 1500,
      labels: "cold,vegetarian",
      sortOrder: 2
    },
    {
      id: juiceId,
      businessId,
      branchId,
      categoryId: juiceCategoryId,
      nameEn: "Fresh Juice Pack",
      nameAr: "عصير طبيعي طازج",
      description: "Cold-pressed seasonal juice from the fridge.",
      descriptionAr: "عصير موسمي مضغوط على البارد من الثلاجة.",
      imageUrl: image("photo-1600271886742-f049cd451bba"),
      priceCents: 1200,
      labels: "fresh",
      sortOrder: 1
    }
  ]);
  await db.insert(itemVariants).values([
    { id: uuid(), menuItemId: latteId, name: "Regular", nameAr: "عادي", priceDelta: 0, sortOrder: 1 },
    { id: uuid(), menuItemId: latteId, name: "Large", nameAr: "كبير", priceDelta: 400, sortOrder: 2 }
  ]);
  await db.insert(itemAddOns).values([
    { id: uuid(), menuItemId: latteId, name: "Extra espresso shot", nameAr: "جرعة إسبريسو إضافية", priceCents: 400, sortOrder: 1 },
    { id: uuid(), menuItemId: latteId, name: "Oat milk", nameAr: "حليب الشوفان", priceCents: 300, sortOrder: 2 },
    { id: uuid(), menuItemId: cakeId, name: "Birthday candle", nameAr: "شمعة عيد ميلاد", priceCents: 100, sortOrder: 1 },
    { id: uuid(), menuItemId: cakeId, name: "Extra cream", nameAr: "كريمة إضافية", priceCents: 300, sortOrder: 2 }
  ]);

  // More of the menu: a few items in every section, with sizes and extras where they make sense.
  type Seed = { cat: string; en: string; ar: string; d: string; da: string; img: string; price: number; labels?: string; variants?: [string, string, number][]; extras?: [string, string, number][] };
  const more: Seed[] = [
    { cat: coffeeId, en: "Cappuccino", ar: "كابتشينو", d: "Double espresso under a thick cap of silky milk foam.", da: "إسبريسو مزدوج تحت طبقة كثيفة من رغوة الحليب الحريرية.", img: "photo-1572442388796-11668a67e53d", price: 1400, labels: "popular", variants: [["Regular", "عادي", 0], ["Large", "كبير", 300]], extras: [["Extra espresso shot", "جرعة إسبريسو إضافية", 400], ["Vanilla syrup", "شراب الفانيلا", 200]] },
    { cat: coffeeId, en: "Flat White", ar: "فلات وايت", d: "Smooth ristretto with velvety steamed milk.", da: "ريستريتو ناعم مع حليب مبخّر مخملي.", img: "photo-1541167760496-1628856ab772", price: 1500 },
    { cat: coffeeId, en: "Americano", ar: "أمريكانو", d: "Espresso lengthened with hot water. Clean and strong.", da: "إسبريسو مع ماء ساخن. صافٍ وقوي.", img: "photo-1514432324607-a09d9b4aefdd", price: 1100, variants: [["Regular", "عادي", 0], ["Large", "كبير", 300]] },
    { cat: coffeeId, en: "Cold Brew", ar: "كولد برو", d: "Slow-steeped for 18 hours and served over ice.", da: "منقوع ببطء لمدة 18 ساعة ويُقدَّم مع الثلج.", img: "photo-1495474472287-4d71bcdd2085", price: 1600, labels: "cold", extras: [["Vanilla syrup", "شراب الفانيلا", 200]] },
    { cat: waffleCategoryId, en: "Classic Waffle", ar: "وافل كلاسيك", d: "Crisp golden waffle with maple syrup and fresh berries.", da: "وافل ذهبي مقرمش مع شراب القيقب وتوت طازج.", img: "photo-1562376552-0d160a2f238d", price: 2400, labels: "popular,vegetarian", extras: [["Chocolate sauce", "صلصة الشوكولاتة", 300], ["Ice cream scoop", "كرة آيس كريم", 500], ["Fresh strawberries", "فراولة طازجة", 400]] },
    { cat: waffleCategoryId, en: "Strawberry Crepe", ar: "كريب الفراولة", d: "Thin crepes filled with cream and fresh strawberries.", da: "كريب رقيق محشو بالكريمة والفراولة الطازجة.", img: "photo-1587314168485-3236d6710814", price: 2600, labels: "vegetarian", extras: [["Extra whipped cream", "كريمة مخفوقة إضافية", 300]] },
    { cat: iceCategoryId, en: "Peach Ice Cream", ar: "آيس كريم الخوخ", d: "Creamy peach ice cream, scooped to order.", da: "آيس كريم خوخ كريمي يُقدَّم حسب الطلب.", img: "photo-1570197788417-0e82375c9371", price: 1600, labels: "cold,vegetarian", variants: [["Single scoop", "كرة واحدة", 0], ["Double scoop", "كرتان", 500], ["Triple scoop", "ثلاث كرات", 1000]] },
    { cat: iceCategoryId, en: "Strawberry Cone", ar: "كون الفراولة", d: "Soft strawberry ice cream in a crisp cone.", da: "آيس كريم فراولة ناعم في كون مقرمش.", img: "photo-1497034825429-c343d7c6a68f", price: 1200, labels: "cold,vegetarian" },
    { cat: sweetsId, en: "Raspberry Cake", ar: "كيكة التوت", d: "Vanilla sponge layered with raspberry cream and berries.", da: "كيك الفانيلا بطبقات كريمة التوت وحبات التوت.", img: "photo-1565958011703-44f9829ba187", price: 2400, labels: "vegetarian", extras: [["Birthday candle", "شمعة عيد ميلاد", 100]] },
    { cat: sweetsId, en: "Lemon Meringue Tart", ar: "تارت الليمون", d: "Buttery tart, tangy lemon curd and toasted meringue.", da: "تارت بالزبدة وكريمة الليمون ومارينغ محمّر.", img: "photo-1519915028121-7d3463d20b13", price: 2200, labels: "vegetarian" },
    { cat: sweetsId, en: "Chocolate Brownie", ar: "براوني الشوكولاتة", d: "Dense, fudgy brownie with a crackled top.", da: "براوني كثيف وطري بوجه مقرمش.", img: "photo-1606313564200-e75d5e30476c", price: 1600, labels: "vegetarian", extras: [["Chocolate sauce", "صلصة الشوكولاتة", 300]] },
    { cat: sweetsId, en: "Brownie Sundae", ar: "براوني مع آيس كريم", d: "Warm brownie, vanilla ice cream and hot fudge.", da: "براوني دافئ مع آيس كريم فانيلا وصلصة الفادج.", img: "photo-1624353365286-3f8d62daad51", price: 2800, labels: "popular,vegetarian" },
    { cat: sweetsId, en: "Strawberry Panna Cotta", ar: "بانا كوتا الفراولة", d: "Chilled vanilla cream topped with fresh strawberries.", da: "كريمة الفانيلا الباردة مع الفراولة الطازجة.", img: "photo-1488477181946-6428a0291777", price: 1800, labels: "cold,vegetarian" },
    { cat: sweetsId, en: "Glazed Donut", ar: "دونات مزيّن", d: "Soft ring donut with chocolate glaze and sprinkles.", da: "دونات طري بطبقة الشوكولاتة والسكر الملون.", img: "photo-1551024601-bec78aea704b", price: 900, labels: "vegetarian" },
    { cat: juiceCategoryId, en: "Fresh Orange Juice", ar: "عصير برتقال طازج", d: "Squeezed to order from ripe oranges. Nothing added.", da: "برتقال ناضج يُعصر عند الطلب بدون إضافات.", img: "photo-1613478223719-2ab802602423", price: 1300, labels: "fresh", variants: [["Medium", "وسط", 0], ["Large", "كبير", 300]] },
    { cat: juiceCategoryId, en: "Berry Smoothie", ar: "سموذي التوت", d: "Blueberries and strawberries blended with yogurt.", da: "توت أزرق وفراولة مخلوطة مع اللبن.", img: "photo-1553530666-ba11a7da3888", price: 1800, labels: "fresh,cold" },
    { cat: juiceCategoryId, en: "Green Smoothie", ar: "سموذي أخضر", d: "Spinach, apple, cucumber and lime. Light and fresh.", da: "سبانخ وتفاح وخيار وليمون. خفيف ومنعش.", img: "photo-1622597467836-f3285f2131b8", price: 1700, labels: "fresh,vegan" }
  ];
  const moreIds = more.map(() => uuid());
  await db.insert(menuItems).values(
    more.map((item, index) => ({
      id: moreIds[index],
      businessId,
      branchId,
      categoryId: item.cat,
      nameEn: item.en,
      nameAr: item.ar,
      description: item.d,
      descriptionAr: item.da,
      imageUrl: image(item.img),
      priceCents: item.price,
      labels: item.labels ?? "",
      sortOrder: 10 + index
    }))
  );
  await db.insert(itemVariants).values(
    more.flatMap((item, index) => (item.variants ?? []).map(([name, nameAr, priceDelta], position) => ({ id: uuid(), menuItemId: moreIds[index], name, nameAr, priceDelta, sortOrder: position + 1 })))
  );
  await db.insert(itemAddOns).values(
    more.flatMap((item, index) => (item.extras ?? []).map(([name, nameAr, priceCents], position) => ({ id: uuid(), menuItemId: moreIds[index], name, nameAr, priceCents, sortOrder: position + 1 })))
  );
  await db.insert(auditLogs).values({
    id: uuid(),
    businessId,
    branchId,
    actorUserId: ownerId,
    action: "seed.created",
    entityType: "business",
    entityId: businessId,
    metadata: { source: "idempotent_seed" }
  });
}

export async function findUserByEmail(email: string) {
  await initializeAndSeed();
  const [user] = await getDb().select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return user;
}

export async function findUserById(id: string) {
  await initializeAndSeed();
  const [user] = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
  return user;
}

// Short fingerprint of the password hash. It is stored in the session token, so a password
// reset (or any change to the hash) signs the user out everywhere without a session table.
export function passwordStamp(passwordHash: string) {
  return createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);
}

// Email and password check. Disabled accounts cannot sign in.
export async function authenticateUser(email: string, password: string) {
  const user = await findUserByEmail(email.trim());
  if (!user || !user.isActive) return null;
  if (!(await bcrypt.compare(password, user.passwordHash))) return null;
  return user;
}

// Re-checks a signed-in session against the database: the account must still exist, be
// active and keep the same password. Returns the live role, so role changes apply at once.
export async function validateSessionUser(userId: string, businessId: string, stamp: string | undefined) {
  await initializeAndSeed();
  const [user] = await getDb()
    .select({ id: users.id, businessId: users.businessId, role: users.role, isActive: users.isActive, passwordHash: users.passwordHash })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.businessId, businessId)))
    .limit(1);
  if (!user || !user.isActive || stamp !== passwordStamp(user.passwordHash)) return null;
  return { userId: user.id, businessId: user.businessId, role: assertRole(user.role) };
}

// Public view of an account: never includes the password hash.
function toStaff(user: typeof users.$inferSelect) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive, createdAt: user.createdAt };
}

export async function listStaff(businessId: string) {
  await initializeAndSeed();
  const rows = await getDb().select().from(users).where(eq(users.businessId, businessId)).orderBy(asc(users.createdAt), asc(users.email));
  return rows.map(toStaff);
}

export type StaffInput = { email: string; name: string; role: UserRole; password: string };

export async function createStaff(businessId: string, actorUserId: string, input: StaffInput) {
  await initializeAndSeed();
  const email = input.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(input.password, 12);
  try {
    return await getDb().transaction(async (tx) => {
      const [row] = await tx
        .insert(users)
        .values({ id: uuid(), businessId, email, name: input.name.trim(), role: input.role, passwordHash })
        .returning();
      await tx.insert(auditLogs).values({
        id: uuid(),
        businessId,
        actorUserId,
        action: "staff.created",
        entityType: "user",
        entityId: row.id,
        metadata: { email, role: row.role }
      });
      return { user: toStaff(row) };
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "That email already has an account", status: 409 as const };
    throw error;
  }
}

export type StaffPatch = { name?: string; role?: UserRole; isActive?: boolean; password?: string };

export async function updateStaff(businessId: string, actorUserId: string, id: string, patch: StaffPatch) {
  await initializeAndSeed();
  const db = getDb();
  const [target] = await db.select().from(users).where(and(eq(users.id, id), eq(users.businessId, businessId))).limit(1);
  if (!target) return { error: "Not found", status: 404 as const };

  if (id === actorUserId) {
    // An owner who disables or demotes themselves could lock the business out.
    if (patch.isActive === false) return { error: "You cannot disable your own account", status: 409 as const };
    if (patch.role && patch.role !== target.role) return { error: "You cannot change your own role", status: 409 as const };
  }

  const set: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  const changed: string[] = [];
  if (patch.name !== undefined && patch.name.trim() !== target.name) {
    set.name = patch.name.trim();
    changed.push("name");
  }
  if (patch.role !== undefined && patch.role !== target.role) {
    set.role = patch.role;
    changed.push("role");
  }
  if (patch.isActive !== undefined && patch.isActive !== target.isActive) {
    set.isActive = patch.isActive;
    changed.push(patch.isActive ? "enabled" : "disabled");
  }
  if (patch.password !== undefined) {
    set.passwordHash = await bcrypt.hash(patch.password, 12);
    changed.push("password");
  }

  const row = await db.transaction(async (tx) => {
    const [updated] = await tx.update(users).set(set).where(and(eq(users.id, id), eq(users.businessId, businessId))).returning();
    if (changed.length) {
      await tx.insert(auditLogs).values({
        id: uuid(),
        businessId,
        actorUserId,
        action: "staff.updated",
        entityType: "user",
        entityId: id,
        metadata: { changed }
      });
    }
    return updated;
  });
  return { user: toStaff(row), passwordChanged: changed.includes("password") };
}

export async function findBranchBySlug(slug: string) {
  await initializeAndSeed();
  const [branch] = await getDb().select().from(branches).where(eq(branches.slug, slug)).limit(1);
  return branch;
}

export async function getQrTokenForBranch(slug: string) {
  await initializeAndSeed();
  const db = getDb();
  const [row] = await db
    .select({ id: qrCodes.id, tokenHash: qrCodes.tokenHash })
    .from(qrCodes)
    .innerJoin(branches, eq(branches.id, qrCodes.branchId))
    .where(and(eq(branches.slug, slug), eq(qrCodes.isActive, true), eq(qrCodes.kind, "branch")))
    .limit(1);
  if (!row) return null;

  return tokenForQr(row);
}

async function tokenForQr(row: { id: string; tokenHash: string }) {
  const token = deriveQrToken(row.id);
  const tokenHash = hashToken(token);
  // Rows created before derived tokens (or after a secret change) get re-keyed so the QR works.
  if (row.tokenHash !== tokenHash) {
    await getDb().update(qrCodes).set({ tokenHash, updatedAt: new Date() }).where(eq(qrCodes.id, row.id));
  }
  return token;
}

export async function listQrCodes(businessId: string) {
  await initializeAndSeed();
  return getDb()
    .select({ id: qrCodes.id, label: qrCodes.label, tableLabel: qrCodes.tableLabel, kind: qrCodes.kind, isActive: qrCodes.isActive })
    .from(qrCodes)
    .where(eq(qrCodes.businessId, businessId))
    .orderBy(asc(qrCodes.kind), asc(qrCodes.createdAt));
}

// Table QR codes carry the table name, so customers do not type it and staff know where to deliver.
export async function createTableQrs(businessId: string, labels: string[]) {
  await initializeAndSeed();
  const db = getDb();
  const [branch] = await db.select().from(branches).where(eq(branches.businessId, businessId)).orderBy(asc(branches.createdAt)).limit(1);
  if (!branch) return null;
  const existing = new Set(
    (await db.select({ tableLabel: qrCodes.tableLabel }).from(qrCodes).where(and(eq(qrCodes.branchId, branch.id), eq(qrCodes.kind, "table")))).map((row) =>
      (row.tableLabel ?? "").toLowerCase()
    )
  );
  // Names are compared ignoring case, so "Table 1" and "table 1" are the same table.
  const fresh: string[] = [];
  for (const label of labels.map((value) => value.trim()).filter(Boolean)) {
    if (!existing.has(label.toLowerCase())) fresh.push(label);
    existing.add(label.toLowerCase());
  }
  if (fresh.length === 0) return [];
  const rows = fresh.map((label) => {
    const id = uuid();
    return { id, businessId, branchId: branch.id, tokenHash: hashToken(deriveQrToken(id)), label, tableLabel: label, kind: "table" };
  });
  return db.insert(qrCodes).values(rows).returning();
}

export async function setTableQrActive(businessId: string, id: string, isActive: boolean) {
  await initializeAndSeed();
  const [row] = await getDb()
    .update(qrCodes)
    .set({ isActive, updatedAt: new Date() })
    .where(and(eq(qrCodes.id, id), eq(qrCodes.businessId, businessId), eq(qrCodes.kind, "table")))
    .returning();
  return row ?? null;
}

export async function getQrTokenById(businessId: string, id: string) {
  await initializeAndSeed();
  const [row] = await getDb()
    .select({ id: qrCodes.id, tokenHash: qrCodes.tokenHash })
    .from(qrCodes)
    .where(and(eq(qrCodes.id, id), eq(qrCodes.businessId, businessId)))
    .limit(1);
  return row ? tokenForQr(row) : null;
}

export async function resolveQrToken(token: string) {
  await initializeAndSeed();
  const [row] = await getDb()
    .select({ qr: qrCodes, branch: branches })
    .from(qrCodes)
    .innerJoin(branches, eq(branches.id, qrCodes.branchId))
    .where(and(eq(qrCodes.tokenHash, hashToken(normalizeQrCode(token))), eq(qrCodes.isActive, true)))
    .limit(1);
  return row ?? null;
}

export async function getFirstBranchForBusiness(businessId: string) {
  await initializeAndSeed();
  const [branch] = await getDb().select().from(branches).where(eq(branches.businessId, businessId)).limit(1);
  return branch;
}

async function getScopedMenuParts(businessId: string, branchId: string) {
  const db = getDb();
  const itemRows = await db
    .select()
    .from(menuItems)
    .where(and(eq(menuItems.businessId, businessId), eq(menuItems.branchId, branchId)))
    .orderBy(asc(menuItems.sortOrder));
  const itemIds = itemRows.map((item) => item.id);
  const [variantRows, addOnRows] = itemIds.length
    ? await Promise.all([
        db.select().from(itemVariants).where(inArray(itemVariants.menuItemId, itemIds)).orderBy(asc(itemVariants.sortOrder)),
        db.select().from(itemAddOns).where(inArray(itemAddOns.menuItemId, itemIds)).orderBy(asc(itemAddOns.sortOrder))
      ])
    : [[], []];
  return { itemRows, variantRows, addOnRows };
}

// The branch behind the plain address "/": the oldest one, or DEFAULT_BRANCH_SLUG when set.
export async function getDefaultBranchSlug() {
  await initializeAndSeed();
  const preferred = process.env.DEFAULT_BRANCH_SLUG?.trim();
  const db = getDb();
  if (preferred) {
    const [match] = await db.select({ slug: branches.slug }).from(branches).where(eq(branches.slug, preferred)).limit(1);
    if (match) return match.slug;
  }
  const [first] = await db.select({ slug: branches.slug }).from(branches).orderBy(asc(branches.createdAt)).limit(1);
  return first?.slug ?? null;
}

// Item ids ranked by units sold in the branch's recent orders (cancelled orders do not count).
async function getPopularIds(branchId: string) {
  const rows = await getDb()
    .select({ lineItems: orders.lineItems })
    .from(orders)
    .where(and(eq(orders.branchId, branchId), ne(orders.status, "cancelled")))
    .orderBy(desc(orders.createdAt))
    .limit(500);
  const sold = new Map<string, number>();
  for (const row of rows) for (const line of row.lineItems) sold.set(line.menuItemId, (sold.get(line.menuItemId) ?? 0) + line.quantity);
  return [...sold.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

export async function getPublicMenu(slug: string) {
  await initializeAndSeed();
  const db = getDb();
  const [branch] = await db.select().from(branches).where(eq(branches.slug, slug)).limit(1);
  if (!branch) return null;

  const [categoryRows, paymentRows] = await Promise.all([
    db
      .select()
      .from(categories)
      .where(and(eq(categories.businessId, branch.businessId), eq(categories.branchId, branch.id), eq(categories.isActive, true)))
      .orderBy(asc(categories.sortOrder)),
    db
      .select()
      .from(paymentMethods)
      .where(and(eq(paymentMethods.businessId, branch.businessId), eq(paymentMethods.branchId, branch.id), eq(paymentMethods.isActive, true)))
      .orderBy(desc(paymentMethods.isDefault))
  ]);
  // Payment methods show in a fixed order: cash first, then PalPay, Jawwal Pay, bank, anything else.
  const paymentRank = (row: { type: string; label: string; labelAr: string | null }) => {
    const name = `${row.label} ${row.labelAr ?? ""}`.toLowerCase();
    if (row.type === "cash_or_card") return 0;
    if (/pal|بال/.test(name)) return 1;
    if (/jawwal|جوال/.test(name)) return 2;
    return row.type === "bank" ? 3 : 4;
  };
  paymentRows.sort((a, b) => paymentRank(a) - paymentRank(b));
  const { itemRows, variantRows, addOnRows } = await getScopedMenuParts(branch.businessId, branch.id);
  const menuCategories = categoryRows.map((category): CategoryView => ({
    id: category.id,
    nameEn: category.nameEn,
    nameAr: category.nameAr,
    products: itemRows.filter((item) => item.categoryId === category.id).map((item) => mapProduct(item, variantRows, addOnRows))
  }));

  // Home carousel: the most ordered items that can be ordered now; when too few orders exist yet,
  // fill with menu items that have a photo, in menu order.
  const orderable = new Map(menuCategories.flatMap((category) => category.products).filter((product) => product.isAvailable && product.imageUrl).map((product) => [product.id, product]));
  const ranked = (await getPopularIds(branch.id)).filter((id) => orderable.has(id));
  // The fill takes one item from each section in turn, so the carousel is not all one kind of food.
  const perSection = menuCategories.map((category) => category.products.filter((product) => orderable.has(product.id)).map((product) => product.id));
  const fill: string[] = [];
  for (let round = 0; fill.length < 12 && round < 12; round++) for (const ids of perSection) if (ids[round]) fill.push(ids[round]);
  const popularIds = [...new Set([...ranked, ...fill])].slice(0, 6);

  return {
    branch: mapBranch(branch),
    categories: menuCategories,
    popularIds,
    paymentMethods: paymentRows.map(mapPayment)
  };
}

export async function getPublicMenuByQrToken(token: string) {
  const resolved = await resolveQrToken(token);
  if (!resolved) return null;
  const menu = await getPublicMenu(resolved.branch.slug);
  return menu ? { ...menu, qr: { token, label: resolved.qr.label, tableLabel: resolved.qr.tableLabel } } : null;
}

export async function getDashboard(branchId: string, businessId: string) {
  await initializeAndSeed();
  const db = getDb();
  const [branch] = await db.select().from(branches).where(and(eq(branches.id, branchId), eq(branches.businessId, businessId))).limit(1);
  if (!branch) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [recentOrders, productCountRows, todaysOrders] = await Promise.all([
    db.select().from(orders).where(and(eq(orders.businessId, businessId), eq(orders.branchId, branchId))).orderBy(desc(orders.createdAt)).limit(8),
    db.select({ value: count() }).from(menuItems).where(and(eq(menuItems.businessId, businessId), eq(menuItems.branchId, branchId))),
    db.select().from(orders).where(and(eq(orders.businessId, businessId), eq(orders.branchId, branchId), gte(orders.createdAt, today)))
  ]);
  return { branch: mapBranch(branch), orders: recentOrders, productCount: productCountRows[0]?.value ?? 0, todaysOrders };
}

export async function getOrders(branchId: string, businessId: string) {
  await initializeAndSeed();
  return getDb()
    .select()
    .from(orders)
    .where(and(eq(orders.businessId, businessId), eq(orders.branchId, branchId)))
    .orderBy(desc(orders.createdAt))
    .limit(50);
}

const statusFlow: OrderStatus[] = ["new", "accepted", "preparing", "ready", "completed"];

// Orders only move forward; cancelling is allowed until completed or cancelled.
export function canMoveTo(from: OrderStatus, to: OrderStatus) {
  if (from === "completed" || from === "cancelled" || from === to) return false;
  return to === "cancelled" || statusFlow.indexOf(to) > statusFlow.indexOf(from);
}

type OrderPatch = { status?: OrderStatus; paymentStatus?: "verified" | "rejected"; cancelReason?: string };

export async function updateOrder(orderId: string, businessId: string, patch: OrderPatch, actorUserId?: string) {
  await initializeAndSeed();
  const db = getDb();
  const [order] = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.businessId, businessId))).limit(1);
  if (!order) return { error: "Not found", status: 404 as const };

  let status = patch.status;
  let paymentStatus = order.paymentStatus;
  let cancelReason = order.cancelReason;
  if (patch.paymentStatus) {
    if (order.paymentStatus !== "pending_review") return { error: "Payment was already reviewed", status: 409 as const };
    paymentStatus = patch.paymentStatus;
    if (patch.paymentStatus === "rejected") {
      status = "cancelled";
      cancelReason = patch.cancelReason?.trim() || "Payment could not be verified";
    }
  }
  if (status) {
    if (!canMoveTo(order.status, status)) return { error: "Invalid status change", status: 409 as const };
    if (status === "cancelled") cancelReason = patch.cancelReason?.trim() || cancelReason || null;
    else if (paymentStatus !== "verified" && paymentStatus !== "pay_at_counter") {
      return { error: "Verify the payment first", status: 409 as const };
    }
  }

  const updated = await db.transaction(async (tx) => {
    // The status in WHERE makes two staff members racing on one order safe: the loser gets a 409.
    const [row] = await tx
      .update(orders)
      .set({ status: status ?? order.status, paymentStatus, cancelReason, updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.businessId, businessId), eq(orders.status, order.status), eq(orders.paymentStatus, order.paymentStatus)))
      .returning();
    if (!row) return null;
    await tx.insert(auditLogs).values({
      id: uuid(),
      businessId,
      branchId: order.branchId,
      actorUserId,
      action: "order.updated",
      entityType: "order",
      entityId: order.id,
      metadata: { from: order.status, to: row.status, paymentFrom: order.paymentStatus, paymentTo: row.paymentStatus, reason: cancelReason }
    });
    return row;
  });
  if (!updated) return { error: "Order changed, refresh and retry", status: 409 as const };
  publish(`business:${businessId}`);
  publish(`order:${updated.id}`);
  return { order: updated };
}

function isUniqueViolation(error: unknown) {
  const codeOf = (value: unknown) => (value && typeof value === "object" && "code" in value ? String(value.code) : "");
  return codeOf(error) === "23505" || codeOf(error && typeof error === "object" && "cause" in error ? error.cause : null) === "23505";
}

export type NewOrderInput = {
  branchSlug: string;
  qrToken?: string | null;
  firstName: string;
  lastName: string;
  customerPhone: string;
  tableLabel?: string | null;
  note?: string | null;
  paymentMethodId: string;
  transferFromPhone?: string | null;
  transferReference?: string | null;
  idempotencyKey?: string | null;
  receipt?: {
    storageKey: string;
    originalName: string;
    mimeType: string;
    size: number;
    checksum: string;
  } | null;
  items: Array<{ productId: string; variantId?: string; addOnIds: string[]; quantity: number }>;
};

export async function createOrder(input: NewOrderInput) {
  await initializeAndSeed();
  const db = getDb();
  const resolvedQr = input.qrToken ? await resolveQrToken(input.qrToken) : null;
  // A code that does not resolve (wrong, or switched off) never falls back to a free-text table.
  if (input.qrToken && !resolvedQr) return { error: "Invalid order", status: 400 as const };
  const branch = resolvedQr?.branch ?? (await db.select().from(branches).where(eq(branches.slug, input.branchSlug)).limit(1))[0];
  if (!branch || !branch.isOpen) return { error: "Branch unavailable", status: 404 as const };

  // A retried submit (flaky Wi-Fi, double tap) returns the original order instead of creating a second one.
  const findReplay = async () => {
    if (!input.idempotencyKey) return null;
    const [existing] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.branchId, branch.id), eq(orders.idempotencyKey, input.idempotencyKey)))
      .limit(1);
    return existing ? { order: existing, trackingToken: deriveOrderToken(existing.id), status: 201 as const, replayed: true as const } : null;
  };
  const replay = await findReplay();
  if (replay) return replay;

  const [payment] = await db
    .select()
    .from(paymentMethods)
    .where(and(eq(paymentMethods.id, input.paymentMethodId), eq(paymentMethods.businessId, branch.businessId), eq(paymentMethods.branchId, branch.id), eq(paymentMethods.isActive, true)))
    .limit(1);
  if (!payment) return { error: "Invalid payment method", status: 400 as const };
  const isCash = payment.type === "cash_or_card";
  if (!isCash && !input.transferFromPhone) {
    return { error: "Transfer details required", status: 400 as const };
  }
  // Proof of payment is the operation number, the receipt photo, or both.
  if (!isCash && !input.transferReference && !input.receipt) {
    return { error: "Payment proof required", status: 400 as const };
  }

  if (!isCash && (input.receipt || input.transferReference)) {
    // Same screenshot or transfer reference on another live order of this branch: likely a reused receipt.
    const [duplicate] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.branchId, branch.id),
          ne(orders.paymentStatus, "rejected"),
          or(
            input.receipt ? eq(orders.receiptChecksum, input.receipt.checksum) : undefined,
            input.transferReference ? eq(orders.transferReference, input.transferReference) : undefined
          )
        )
      )
      .limit(1);
    if (duplicate) return { error: "This receipt or reference was already used", status: 409 as const };
  }

  const { itemRows, variantRows, addOnRows } = await getScopedMenuParts(branch.businessId, branch.id);
  let totalCents = 0;
  const lineItems: OrderLineItem[] = [];
  for (const submitted of input.items) {
    const item = itemRows.find((candidate) => candidate.id === submitted.productId);
    if (!item || !item.isAvailable) return { error: "Item unavailable", status: 409 as const };

    const itemVariants = variantRows.filter((candidate) => candidate.menuItemId === item.id);
    const variant = submitted.variantId ? itemVariants.find((candidate) => candidate.id === submitted.variantId) : itemVariants[0];
    if (submitted.variantId && !variant) return { error: "Invalid option", status: 400 as const };

    const addOnIds = [...new Set(submitted.addOnIds)];
    const selectedAddOns = addOnRows.filter((addOn) => addOn.menuItemId === item.id && addOnIds.includes(addOn.id));
    if (selectedAddOns.length !== addOnIds.length) return { error: "Invalid option", status: 400 as const };

    const unitCents = item.priceCents + (variant?.priceDelta ?? 0) + selectedAddOns.reduce((sum, addOn) => sum + addOn.priceCents, 0);
    totalCents += unitCents * submitted.quantity;
    lineItems.push({
      menuItemId: item.id,
      name: item.nameEn,
      nameAr: item.nameAr,
      quantity: submitted.quantity,
      unitCents,
      selectedVariant: variant ? { id: variant.id, name: variant.name, ...(variant.nameAr ? { nameAr: variant.nameAr } : {}), priceDelta: variant.priceDelta } : null,
      selectedAddOns: selectedAddOns.map((addOn) => ({ id: addOn.id, name: addOn.name, ...(addOn.nameAr ? { nameAr: addOn.nameAr } : {}), priceCents: addOn.priceCents }))
    });
  }
  if (totalCents < 1) return { error: "Invalid total", status: 400 as const };

  const orderId = uuid();
  const trackingToken = deriveOrderToken(orderId);
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  try {
    const order = await db.transaction(async (tx) => {
      // One atomic counter per branch: concurrent orders can never read the same number.
      const [counter] = await tx
        .update(branches)
        .set({ nextOrderNumber: sql`${branches.nextOrderNumber} + 1` })
        .where(eq(branches.id, branch.id))
        .returning();
      const [created] = await tx
        .insert(orders)
        .values({
          id: orderId,
          businessId: branch.businessId,
          branchId: branch.id,
          orderNumber: counter.nextOrderNumber - 1,
          publicTokenHash: hashToken(trackingToken),
          idempotencyKey: input.idempotencyKey ?? null,
          paymentStatus: isCash ? "pay_at_counter" : "pending_review",
          qrCodeId: resolvedQr?.qr.id ?? null,
          firstName,
          lastName,
          customerName: `${firstName} ${lastName}`.trim(),
          customerPhone: input.customerPhone,
          tableLabel: resolvedQr?.qr.tableLabel || input.tableLabel || null,
          note: input.note || null,
          totalCents,
          paymentMethodId: payment.id,
          paymentMethodLabel: payment.label,
          paymentMethodLabelAr: payment.labelAr,
          transferFromPhone: isCash ? "" : input.transferFromPhone ?? "",
          transferReference: isCash ? "" : input.transferReference ?? "",
          receiptStorageKey: input.receipt?.storageKey ?? null,
          receiptOriginalName: input.receipt?.originalName ?? null,
          receiptMimeType: input.receipt?.mimeType ?? null,
          receiptSize: input.receipt?.size ?? null,
          receiptChecksum: input.receipt?.checksum ?? null,
          lineItems
        })
        .returning();
      await tx.insert(auditLogs).values({
        id: uuid(),
        businessId: branch.businessId,
        branchId: branch.id,
        action: "order.created",
        entityType: "order",
        entityId: created.id,
        metadata: { totalCents, paymentMethod: payment.label }
      });
      return created;
    });
    publish(`business:${branch.businessId}`);
    return { order, trackingToken, status: 201 as const, replayed: false as const };
  } catch (error) {
    // Two identical retries in flight at once: the loser of the unique index returns the winner's order.
    if (isUniqueViolation(error)) {
      const raced = await findReplay();
      if (raced) return raced;
    }
    throw error;
  }
}

export async function getPublicOrderProgress(trackingToken: string) {
  await initializeAndSeed();
  const [order] = await getDb()
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      totalCents: orders.totalCents,
      firstName: orders.firstName,
      tableLabel: orders.tableLabel,
      cancelReason: orders.cancelReason,
      paymentStatus: orders.paymentStatus,
      createdAt: orders.createdAt,
      lineItems: orders.lineItems,
      note: orders.note,
      paymentMethodLabel: orders.paymentMethodLabel,
      paymentMethodLabelAr: orders.paymentMethodLabelAr,
      currency: branches.currency,
      branchSlug: branches.slug,
      branchName: branches.name,
      branchNameAr: branches.nameAr
    })
    .from(orders)
    .innerJoin(branches, eq(branches.id, orders.branchId))
    .where(eq(orders.publicTokenHash, hashToken(trackingToken)))
    .limit(1);
  if (!order) return null;
  return { ...order, progress: mapCustomerProgress(order.status), awaitingPayment: order.paymentStatus === "pending_review" };
}

export type CustomerProgress = "confirmed" | "accepted" | "preparing" | "ready" | "done" | "cancelled";

function mapCustomerProgress(status: OrderStatus): CustomerProgress {
  if (status === "cancelled") return "cancelled";
  if (status === "accepted") return "accepted";
  if (status === "preparing") return "preparing";
  if (status === "ready") return "ready";
  if (status === "completed") return "done";
  return "confirmed";
}

export async function getOrderReceipt(orderId: string, businessId: string) {
  await initializeAndSeed();
  const [row] = await getDb()
    .select({ storageKey: orders.receiptStorageKey })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.businessId, businessId)))
    .limit(1);
  return row?.storageKey ?? null;
}

export async function getAuditLogsForBusiness(businessId: string) {
  await initializeAndSeed();
  return getDb().select().from(auditLogs).where(eq(auditLogs.businessId, businessId)).orderBy(desc(auditLogs.createdAt));
}

export type ItemInput = {
  categoryId: string;
  nameEn: string;
  nameAr: string;
  description: string;
  descriptionAr?: string;
  imageUrl: string;
  priceCents: number;
  isAvailable?: boolean;
  isFeatured?: boolean;
  labels?: string;
  variants: Array<{ id?: string; name: string; nameAr?: string; priceDelta: number }>;
  addOns: Array<{ id?: string; name: string; nameAr?: string; priceCents: number }>;
};

export async function getMenuAdmin(businessId: string) {
  await initializeAndSeed();
  const db = getDb();
  const [branch] = await db.select().from(branches).where(eq(branches.businessId, businessId)).orderBy(asc(branches.createdAt)).limit(1);
  if (!branch) return null;
  const categoryRows = await db
    .select()
    .from(categories)
    .where(and(eq(categories.businessId, businessId), eq(categories.branchId, branch.id)))
    .orderBy(asc(categories.sortOrder));
  const { itemRows, variantRows, addOnRows } = await getScopedMenuParts(businessId, branch.id);
  return {
    branch: mapBranch(branch),
    categories: categoryRows.map((category) => ({
      id: category.id,
      nameEn: category.nameEn,
      nameAr: category.nameAr,
      isActive: category.isActive,
      items: itemRows
        .filter((item) => item.categoryId === category.id)
        .map((item) => ({
          ...mapProduct(item, variantRows, addOnRows),
          labels: item.labels,
          isFeatured: item.isFeatured
        }))
    }))
  };
}

export async function toggleItemAvailability(itemId: string, businessId: string, isAvailable: boolean) {
  await initializeAndSeed();
  const [item] = await getDb()
    .update(menuItems)
    .set({ isAvailable })
    .where(and(eq(menuItems.id, itemId), eq(menuItems.businessId, businessId)))
    .returning();
  return item ?? null;
}

export async function updateMenuItem(itemId: string, businessId: string, input: { isAvailable?: boolean; priceCents?: number }) {
  await initializeAndSeed();
  const [item] = await getDb()
    .update(menuItems)
    .set(input)
    .where(and(eq(menuItems.id, itemId), eq(menuItems.businessId, businessId)))
    .returning();
  return item ?? null;
}

// Creates or fully updates an item with its options. Options that keep their id are updated in
// place, new ones are added and missing ones are removed. Past orders keep their own copy of
// names and prices, so editing the menu never changes an old order.
export async function saveItem(businessId: string, input: ItemInput, id?: string) {
  await initializeAndSeed();
  const db = getDb();
  const [category] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, input.categoryId), eq(categories.businessId, businessId)))
    .limit(1);
  if (!category) return { error: "Category not found", status: 400 as const };

  return db.transaction(async (tx) => {
    const fields = {
      categoryId: category.id,
      nameEn: input.nameEn,
      nameAr: input.nameAr,
      description: input.description,
      descriptionAr: input.descriptionAr?.trim() || null,
      imageUrl: input.imageUrl,
      priceCents: input.priceCents,
      isAvailable: input.isAvailable ?? true,
      isFeatured: input.isFeatured ?? false,
      labels: input.labels ?? ""
    };
    let itemId = id;
    if (id) {
      const [updated] = await tx
        .update(menuItems)
        .set(fields)
        .where(and(eq(menuItems.id, id), eq(menuItems.businessId, businessId)))
        .returning();
      if (!updated) return { error: "Not found", status: 404 as const };
    } else {
      const [last] = await tx
        .select({ value: sql<number>`coalesce(max(${menuItems.sortOrder}), 0)` })
        .from(menuItems)
        .where(eq(menuItems.categoryId, category.id));
      itemId = uuid();
      await tx.insert(menuItems).values({ id: itemId, businessId, branchId: category.branchId, sortOrder: (last?.value ?? 0) + 1, ...fields });
    }
    const menuItemId = itemId as string;

    const keptVariants = input.variants.flatMap((variant) => (variant.id ? [variant.id] : []));
    const oldVariants = await tx.select({ id: itemVariants.id }).from(itemVariants).where(eq(itemVariants.menuItemId, menuItemId));
    const goneVariants = oldVariants.map((row) => row.id).filter((variantId) => !keptVariants.includes(variantId));
    if (goneVariants.length) await tx.delete(itemVariants).where(inArray(itemVariants.id, goneVariants));
    for (const [index, variant] of input.variants.entries()) {
      const known = variant.id && oldVariants.some((row) => row.id === variant.id);
      if (known) {
        await tx.update(itemVariants).set({ name: variant.name, nameAr: variant.nameAr?.trim() || null, priceDelta: variant.priceDelta, sortOrder: index + 1 }).where(eq(itemVariants.id, variant.id as string));
      } else {
        await tx.insert(itemVariants).values({ id: uuid(), menuItemId, name: variant.name, nameAr: variant.nameAr?.trim() || null, priceDelta: variant.priceDelta, sortOrder: index + 1 });
      }
    }

    const keptAddOns = input.addOns.flatMap((addOn) => (addOn.id ? [addOn.id] : []));
    const oldAddOns = await tx.select({ id: itemAddOns.id }).from(itemAddOns).where(eq(itemAddOns.menuItemId, menuItemId));
    const goneAddOns = oldAddOns.map((row) => row.id).filter((addOnId) => !keptAddOns.includes(addOnId));
    if (goneAddOns.length) await tx.delete(itemAddOns).where(inArray(itemAddOns.id, goneAddOns));
    for (const [index, addOn] of input.addOns.entries()) {
      const known = addOn.id && oldAddOns.some((row) => row.id === addOn.id);
      if (known) {
        await tx.update(itemAddOns).set({ name: addOn.name, nameAr: addOn.nameAr?.trim() || null, priceCents: addOn.priceCents, sortOrder: index + 1 }).where(eq(itemAddOns.id, addOn.id as string));
      } else {
        await tx.insert(itemAddOns).values({ id: uuid(), menuItemId, name: addOn.name, nameAr: addOn.nameAr?.trim() || null, priceCents: addOn.priceCents, sortOrder: index + 1 });
      }
    }
    return { id: menuItemId };
  });
}

export async function deleteItem(businessId: string, id: string) {
  await initializeAndSeed();
  const [row] = await getDb()
    .delete(menuItems)
    .where(and(eq(menuItems.id, id), eq(menuItems.businessId, businessId)))
    .returning();
  return Boolean(row);
}

export async function createCategory(businessId: string, input: { nameEn: string; nameAr: string }) {
  await initializeAndSeed();
  const db = getDb();
  const [branch] = await db.select().from(branches).where(eq(branches.businessId, businessId)).orderBy(asc(branches.createdAt)).limit(1);
  if (!branch) return null;
  const [last] = await db
    .select({ value: sql<number>`coalesce(max(${categories.sortOrder}), 0)` })
    .from(categories)
    .where(eq(categories.branchId, branch.id));
  const [row] = await db
    .insert(categories)
    .values({ id: uuid(), businessId, branchId: branch.id, sortOrder: (last?.value ?? 0) + 1, ...input })
    .returning();
  return row;
}

export async function updateCategory(businessId: string, id: string, input: { nameEn?: string; nameAr?: string; isActive?: boolean }) {
  await initializeAndSeed();
  const [row] = await getDb()
    .update(categories)
    .set(input)
    .where(and(eq(categories.id, id), eq(categories.businessId, businessId)))
    .returning();
  return row ?? null;
}

export async function getSettings(businessId: string) {
  await initializeAndSeed();
  const db = getDb();
  const [branch] = await db.select().from(branches).where(eq(branches.businessId, businessId)).orderBy(asc(branches.createdAt)).limit(1);
  if (!branch) return null;
  const methods = await db
    .select()
    .from(paymentMethods)
    .where(and(eq(paymentMethods.businessId, businessId), eq(paymentMethods.branchId, branch.id)))
    .orderBy(desc(paymentMethods.isDefault), asc(paymentMethods.label));
  return { branch, paymentMethods: methods };
}

export async function updateBranch(
  businessId: string,
  patch: Partial<Pick<typeof branches.$inferInsert, "name" | "nameAr" | "address" | "phone" | "currency" | "isOpen">>
) {
  await initializeAndSeed();
  const [first] = await getDb().select({ id: branches.id }).from(branches).where(eq(branches.businessId, businessId)).orderBy(asc(branches.createdAt)).limit(1);
  if (!first) return null;
  const [branch] = await getDb()
    .update(branches)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(branches.id, first.id), eq(branches.businessId, businessId)))
    .returning();
  return branch ?? null;
}

type PaymentInput = Pick<typeof paymentMethods.$inferInsert, "label" | "labelAr" | "type" | "accountName" | "phone" | "details" | "detailsAr" | "isDefault" | "isActive">;

// Orders keep a copy of the label, so methods are deactivated rather than deleted.
export async function savePaymentMethod(businessId: string, input: Partial<PaymentInput>, id?: string) {
  await initializeAndSeed();
  const db = getDb();
  const [branch] = await db.select().from(branches).where(eq(branches.businessId, businessId)).orderBy(asc(branches.createdAt)).limit(1);
  if (!branch) return null;
  return db.transaction(async (tx) => {
    // Only one default method per branch.
    if (input.isDefault) {
      await tx.update(paymentMethods).set({ isDefault: false }).where(and(eq(paymentMethods.businessId, businessId), eq(paymentMethods.branchId, branch.id)));
    }
    if (id) {
      const [row] = await tx
        .update(paymentMethods)
        .set(input)
        .where(and(eq(paymentMethods.id, id), eq(paymentMethods.businessId, businessId)))
        .returning();
      return row ?? null;
    }
    const [row] = await tx
      .insert(paymentMethods)
      .values({ id: uuid(), businessId, branchId: branch.id, label: "", type: "other", accountName: "", phone: "", details: "", ...input })
      .returning();
    return row;
  });
}

function mapBranch(branch: typeof branches.$inferSelect): BranchView {
  return { id: branch.id, name: branch.name, nameAr: branch.nameAr, slug: branch.slug, address: branch.address, phone: branch.phone, currency: branch.currency, isOpen: branch.isOpen };
}

function mapProduct(item: typeof menuItems.$inferSelect, variants: Array<typeof itemVariants.$inferSelect>, addOns: Array<typeof itemAddOns.$inferSelect>): ProductView {
  return {
    id: item.id,
    categoryId: item.categoryId,
    nameEn: item.nameEn,
    nameAr: item.nameAr,
    description: item.description,
    descriptionAr: item.descriptionAr,
    imageUrl: item.imageUrl,
    priceCents: item.priceCents,
    isAvailable: item.isAvailable,
    isFeatured: item.isFeatured,
    labels: item.labels,
    variants: variants.filter((variant) => variant.menuItemId === item.id).map((variant): VariantView => ({ id: variant.id, name: variant.name, nameAr: variant.nameAr, priceDelta: variant.priceDelta })),
    addOns: addOns.filter((addOn) => addOn.menuItemId === item.id).map((addOn): AddOnView => ({ id: addOn.id, name: addOn.name, nameAr: addOn.nameAr, priceCents: addOn.priceCents }))
  };
}

function mapPayment(method: typeof paymentMethods.$inferSelect): PaymentMethodView {
  return {
    id: method.id,
    label: method.label,
    labelAr: method.labelAr,
    type: method.type,
    accountName: method.accountName,
    phone: method.phone,
    details: method.details,
    detailsAr: method.detailsAr,
    isDefault: method.isDefault
  };
}

export function assertRole(role: string): UserRole {
  if (role === "owner" || role === "manager" || role === "staff") return role;
  return "staff";
}
