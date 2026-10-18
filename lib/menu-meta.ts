import type { Metadata } from "next";
import { cache } from "react";
import { localized, type Lang } from "@/lib/i18n";
import { getDefaultBranchSlug, getPublicMenu, getPublicMenuByQrToken } from "@/lib/store";

// A page and its metadata ask for the same menu: these share one database read per request.
export const menuBySlug = cache(getPublicMenu);
export const menuByCode = cache(getPublicMenuByQrToken);
export const defaultSlug = cache(getDefaultBranchSlug);

type Menu = NonNullable<Awaited<ReturnType<typeof getPublicMenu>>>;

// Tab title and share text carry the venue's name, in the customer's language.
export function menuMetadata(menu: Menu | null, lang: Lang): Metadata {
  if (!menu) return {};
  const venue = localized(lang, menu.branch.name, menu.branch.nameAr);
  const ar = lang === "ar";
  const description = ar ? "اطلب من طاولتك: اختر وادفع وتابع طلبك مباشرة." : "Order from your table: choose, pay and follow your order live.";
  return { title: `${venue} | ${ar ? "القائمة" : "Menu"}`, description, openGraph: { title: venue, description } };
}
