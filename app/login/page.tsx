import "../admin.css";
import LoginForm from "@/components/admin/LoginForm";
import { requestLang } from "@/lib/request-lang";

export default async function LoginPage() {
  return <LoginForm initialLang={await requestLang()} />;
}
