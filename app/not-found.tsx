import Link from "next/link";
import { requestLang } from "@/lib/request-lang";

export default async function NotFound() {
  const lang = await requestLang();
  const ar = lang === "ar";
  return (
    <div className="fd" dir={ar ? "rtl" : "ltr"} lang={lang}>
      <main className="fd-lost">
        <img alt="" height={88} src="/logo.png" width={78} />
        <h1>{ar ? "لم نجد هذه الصفحة" : "We can't find that page"}</h1>
        <p>{ar ? "ربما تغيّر الرابط أو انتهت صلاحيته. ارجع إلى القائمة." : "The link may have changed or expired. Go back to the menu."}</p>
        <Link className="fd-btn fd-live" href="/">
          {ar ? "العودة إلى القائمة" : "Back to the menu"}
        </Link>
      </main>
    </div>
  );
}
