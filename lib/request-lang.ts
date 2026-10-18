import { cookies } from "next/headers";
import { langCookie, pickInitialLang } from "@/lib/i18n";

// The customer's language is the saved choice (cookie); Arabic is the default, so the very first
// render is already in the right language and direction.
export async function requestLang() {
  const cookieStore = await cookies();
  return pickInitialLang(cookieStore.get(langCookie)?.value);
}

// "?table=5" on the plain menu link; table QR codes carry their own table name instead.
export function tableFromQuery(value: string | string[] | undefined) {
  const raw = (Array.isArray(value) ? value[0] : value)?.trim().slice(0, 40);
  if (!raw) return null;
  return /^table\b/i.test(raw) ? raw : `Table ${raw}`;
}
