import type { CartLine } from "@/components/customer/useCart";

// The customer's open order (what they added, the kitchen note) and the order they placed are kept
// in cookies, so a closed tab, a phone call or a switch to the bank app loses nothing. The server
// reads the same cookies, so the very first paint already shows the right counts.
export type CartSnapshot = { lines: CartLine[]; note: string };

export const cartCookie = (slug: string) => `fd_cart_${slug}`;
export const orderCookie = (slug: string) => `fd_order_${slug}`;
export const cookieMaxAge = 60 * 60 * 24 * 30;

const MAX_LENGTH = 3600;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeCart(snapshot: CartSnapshot): string {
  const pack = (lines: CartLine[], note: string) =>
    encodeURIComponent(JSON.stringify({ l: lines.map((line) => [line.productId, line.variantId ?? "", line.addOnIds, line.quantity]), n: note }));
  let lines = snapshot.lines;
  let value = pack(lines, snapshot.note);
  // A cookie holds about 4 KB: shed the note first, then the newest lines, rather than lose everything.
  if (value.length > MAX_LENGTH) value = pack(lines, "");
  while (value.length > MAX_LENGTH && lines.length > 1) {
    lines = lines.slice(0, -1);
    value = pack(lines, "");
  }
  return value;
}

export function decodeCart(raw: string | undefined | null): CartSnapshot {
  const empty: CartSnapshot = { lines: [], note: "" };
  if (!raw) return empty;
  try {
    const data = JSON.parse(decodeURIComponent(raw)) as { l?: unknown; n?: unknown };
    if (!Array.isArray(data.l)) return empty;
    const lines: CartLine[] = [];
    for (const entry of data.l) {
      if (!Array.isArray(entry)) continue;
      const [productId, variantId, addOnIds, quantity] = entry as [unknown, unknown, unknown, unknown];
      if (typeof productId !== "string" || !uuid.test(productId)) continue;
      if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > 25) continue;
      if (!Array.isArray(addOnIds) || !addOnIds.every((id) => typeof id === "string" && uuid.test(id))) continue;
      lines.push({ productId, variantId: typeof variantId === "string" && uuid.test(variantId) ? variantId : undefined, addOnIds: addOnIds as string[], quantity: quantity as number });
    }
    return { lines, note: typeof data.n === "string" ? data.n.slice(0, 240) : "" };
  } catch {
    return empty;
  }
}

// Cookies written by the browser are Secure on https (the live site) and plain on http (localhost).
export const secureFlag = () => (typeof location !== "undefined" && location.protocol === "https:" ? "; secure" : "");

export function writeCookie(name: string, value: string | null) {
  const attributes = `path=/; samesite=lax; max-age=${value === null ? 0 : cookieMaxAge}${secureFlag()}`;
  document.cookie = `${name}=${value ?? ""}; ${attributes}`;
}
