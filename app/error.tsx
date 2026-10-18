"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { langCookie } from "@/lib/i18n";

// Shown when a page fails while rendering. The customer can retry or go back to the menu.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [ar, setAr] = useState(true);
  useEffect(() => {
    setAr(!document.cookie.includes(`${langCookie}=en`));
    console.error(error);
  }, [error]);

  return (
    <div className="fd" dir={ar ? "rtl" : "ltr"} lang={ar ? "ar" : "en"}>
      <main className="fd-lost">
        <img alt="" height={88} src="/logo.png" width={78} />
        <h1>{ar ? "حدث خطأ ما" : "Something went wrong"}</h1>
        <p>{ar ? "حاول مرة أخرى. إذا استمرت المشكلة اطلب المساعدة من أحد الموظفين." : "Try again. If it keeps happening, ask a member of staff."}</p>
        <button className="fd-btn fd-live" onClick={reset} type="button">
          {ar ? "حاول مرة أخرى" : "Try again"}
        </button>
        <Link className="fd-link" href="/">
          {ar ? "العودة إلى القائمة" : "Back to the menu"}
        </Link>
      </main>
    </div>
  );
}
