import type { Metadata } from "next";
import "../admin.css";
import LoginForm from "@/components/admin/LoginForm";
import { requestLang } from "@/lib/request-lang";

export const metadata: Metadata = { title: "FineDine | Staff sign-in", robots: { index: false, follow: false } };

export default async function LoginPage() {
  return <LoginForm initialLang={await requestLang()} />;
}
