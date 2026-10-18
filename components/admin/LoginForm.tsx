"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { Lang } from "@/lib/i18n-admin";
import AdminFrame, { useAdmin } from "./AdminFrame";

// Demo credentials are only shown and prefilled in development builds.
const showDemo = process.env.NODE_ENV !== "production";

export default function LoginForm({ initialLang }: { initialLang: Lang }) {
  return (
    <AdminFrame initialLang={initialLang}>
      <Form />
    </AdminFrame>
  );
}

function Form() {
  const router = useRouter();
  const { t, switchLanguage } = useAdmin();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), password: data.get("password") })
      });
      if (!response.ok) {
        setError(response.status === 429 ? t.login.tooMany : t.login.failed);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError(t.noConnection);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="fda-login">
      <form className="fda-login-card" onSubmit={submit}>
        <div className="fda-actions" style={{ justifyContent: "space-between" }}>
          <img alt="" className="fd-logo" height={44} src="/logo.png" width={39} />
          <button aria-label={t.switchLabel} className="fd-pill-btn" onClick={switchLanguage} type="button">
            {t.switchTo}
          </button>
        </div>
        <div>
          <h1>{t.login.title}</h1>
          <p className="fda-muted">{t.login.subtitle}</p>
        </div>
        {showDemo ? (
          <p className="fda-muted">
            {t.login.demo}: <bdi dir="ltr">owner@finedine.local / FineDine123!</bdi>
          </p>
        ) : null}
        <label className="fda-field">
          {t.login.email}
          <input autoComplete="username" className="fd-input" defaultValue={showDemo ? "owner@finedine.local" : undefined} dir="ltr" name="email" required type="email" />
        </label>
        <label className="fda-field">
          {t.login.password}
          <input autoComplete="current-password" className="fd-input" defaultValue={showDemo ? "FineDine123!" : undefined} dir="ltr" name="password" required type="password" />
        </label>
        {error ? (
          <p className="fda-error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="fda-btn fda-btn--block" disabled={busy}>
          {busy ? t.login.busy : t.login.submit}
        </button>
      </form>
    </main>
  );
}
