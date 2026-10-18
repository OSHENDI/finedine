"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { formatPrice, numberFormat, plainNumber } from "@/lib/i18n";
import { adminText, langCookie, type AdminText, type Lang } from "@/lib/i18n-admin";

type AdminContext = {
  lang: Lang;
  t: AdminText;
  switchLanguage: () => void;
  money: (cents: number, currency: string) => string;
  number: (value: number) => string;
  plain: (value: number) => string;
};

const Context = createContext<AdminContext | null>(null);

export function useAdmin() {
  const value = useContext(Context);
  if (!value) throw new Error("useAdmin must be used inside AdminFrame");
  return value;
}

// Carries the language for every staff screen: sets direction, and gives components their text.
export default function AdminFrame({ initialLang, className, children }: { initialLang: Lang; className?: string; children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang);

  const switchLanguage = useCallback(() => {
    const next: Lang = lang === "ar" ? "en" : "ar";
    setLang(next);
    document.cookie = `${langCookie}=${next}; path=/; max-age=31536000; samesite=lax`;
  }, [lang]);

  const value = useMemo<AdminContext>(
    () => ({
      lang,
      t: adminText(lang),
      switchLanguage,
      money: (cents, currency) => formatPrice(cents, currency, lang),
      number: (amount) => numberFormat(lang).format(amount),
      plain: (amount) => plainNumber(lang, amount)
    }),
    [lang, switchLanguage]
  );

  return (
    <Context.Provider value={value}>
      <div className={`fd ${className ?? ""}`} dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
        {children}
      </div>
    </Context.Provider>
  );
}
