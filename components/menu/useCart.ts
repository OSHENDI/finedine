"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cartCookie, encodeCart, writeCookie, type CartSnapshot } from "@/lib/cart-cookie";
import { localized, type Lang } from "@/lib/i18n";
import type { ProductView } from "@/types/menu";

// The open order stores only ids. Names and prices are rebuilt from the current menu and language
// every time, so a price change or a language switch is always reflected and the server stays the judge.
export type CartLine = { productId: string; variantId?: string; addOnIds: string[]; quantity: number };

export type CartEntry = {
  key: string;
  line: CartLine;
  product: ProductView;
  name: string;
  detail: string;
  unitCents: number;
};

export const lineKey = (line: CartLine) => `${line.productId}:${line.variantId ?? "standard"}:${[...line.addOnIds].sort().join(",")}`;
export const plainKey = (productId: string) => lineKey({ productId, addOnIds: [], quantity: 1 });

// Browser storage can be missing or blocked (private mode); everything must work without it.
export function readStored<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: unknown) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // persistence is a convenience only
  }
}

export function useCart(slug: string, products: Map<string, ProductView>, lang: Lang, initial: CartSnapshot) {
  const [lines, setLines] = useState<CartLine[]>(() =>
    initial.lines.filter((line) => products.get(line.productId)?.isAvailable)
  );
  const [note, setNote] = useState(initial.note);
  const first = useRef(true);

  // Every change is saved to the cookie the server also reads. The first render only mirrors it.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    writeCookie(cartCookie(slug), lines.length ? encodeCart({ lines, note }) : null);
  }, [slug, lines, note]);

  const entries = useMemo(
    () =>
      lines.flatMap((line): CartEntry[] => {
        const product = products.get(line.productId);
        if (!product) return [];
        const variant = product.variants.find((item) => item.id === line.variantId);
        const addOns = product.addOns.filter((addOn) => line.addOnIds.includes(addOn.id));
        const unitCents = product.priceCents + (variant?.priceDelta ?? 0) + addOns.reduce((sum, addOn) => sum + addOn.priceCents, 0);
        const detail = [variant ? localized(lang, variant.name, variant.nameAr) : null, ...addOns.map((addOn) => localized(lang, addOn.name, addOn.nameAr))]
          .filter(Boolean)
          .join(lang === "ar" ? "، " : ", ");
        return [{ key: lineKey(line), line, product, name: localized(lang, product.nameEn, product.nameAr), detail, unitCents }];
      }),
    [lines, products, lang]
  );

  const totalCents = entries.reduce((sum, entry) => sum + entry.unitCents * entry.line.quantity, 0);
  const count = entries.reduce((sum, entry) => sum + entry.line.quantity, 0);

  // How many of one item are in the order, across its sizes and extras.
  const quantities = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of entries) map.set(entry.product.id, (map.get(entry.product.id) ?? 0) + entry.line.quantity);
    return map;
  }, [entries]);

  const add = useCallback((line: CartLine) => {
    setLines((current) => {
      const existing = current.find((item) => lineKey(item) === lineKey(line));
      if (existing) return current.map((item) => (item === existing ? { ...item, quantity: Math.min(25, item.quantity + line.quantity) } : item));
      return [...current, line];
    });
  }, []);

  const changeQuantity = useCallback((key: string, delta: number) => {
    setLines((current) =>
      current
        .map((line) => (lineKey(line) === key ? { ...line, quantity: Math.min(25, line.quantity + delta) } : line))
        .filter((line) => line.quantity > 0)
    );
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setNote("");
  }, []);

  return { entries, totalCents, count, quantities, note, setNote, add, changeQuantity, clear };
}
