import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { requestLang } from "@/lib/request-lang";
import "./base.css";
import "./customer.css";

// Thmanyah Sans supplied by the owner (custom-font/). Served from this app, so pages never wait
// for, or leak requests to, a font CDN.
const brand = localFont({
  // Three weights, as compressed WOFF2 subsets (Arabic and Latin): about a third of the original files.
  src: [
    { path: "../custom-font/thmanyah-sans-regular.woff2", weight: "300 500", style: "normal" },
    { path: "../custom-font/thmanyah-sans-bold.woff2", weight: "600 700", style: "normal" },
    { path: "../custom-font/thmanyah-sans-black.woff2", weight: "800 900", style: "normal" }
  ],
  variable: "--font-brand",
  display: "swap"
});

export const metadata: Metadata = {
  title: "FineDine",
  description: "Order from your table: scan, choose, pay and follow your order."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#faf7ea"
};

// Marks the tab as having seen the intro animation before first paint, so a reload does not
// flash it again.
const introGuard = `try{if(sessionStorage.getItem("fd_intro"))document.documentElement.dataset.intro="seen"}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await requestLang();
  return (
    <html className={brand.variable} dir={lang === "ar" ? "rtl" : "ltr"} lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: introGuard }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
