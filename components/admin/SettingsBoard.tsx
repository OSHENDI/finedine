"use client";

import { FormEvent } from "react";
import { useAdmin } from "@/components/admin/AdminFrame";
import PageHead from "@/components/admin/PageHead";
import { useAdminAction } from "@/components/admin/useAdminAction";

type Branch = { name: string; nameAr: string | null; address: string; phone: string; currency: string; isOpen: boolean };
type Method = {
  id: string;
  label: string;
  labelAr: string | null;
  type: string;
  accountName: string;
  phone: string;
  details: string;
  detailsAr: string | null;
  isDefault: boolean;
  isActive: boolean;
};

export default function SettingsBoard({ branch, paymentMethods, canEdit }: { branch: Branch; paymentMethods: Method[]; canEdit: boolean }) {
  const { t } = useAdmin();
  const { busy, message, run } = useAdminAction();

  function submitBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run("/api/admin/branch", "PATCH", {
      name: data.get("name"),
      nameAr: data.get("nameAr"),
      address: data.get("address"),
      phone: data.get("phone"),
      currency: String(data.get("currency")).toUpperCase()
    });
  }

  async function submitMethod(event: FormEvent<HTMLFormElement>, id?: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const result = await run(id ? `/api/admin/payment-methods/${id}` : "/api/admin/payment-methods", id ? "PATCH" : "POST", {
      label: data.get("label"),
      labelAr: data.get("labelAr"),
      type: data.get("type"),
      accountName: data.get("accountName"),
      phone: data.get("phone"),
      details: data.get("details"),
      detailsAr: data.get("detailsAr"),
      isDefault: data.get("isDefault") === "on",
      isActive: id ? data.get("isActive") === "on" : true
    });
    if (result.ok && !id) form.reset();
  }

  return (
    <>
      <PageHead page="settings" />
      <div className="fda-stack">
        {message ? (
          <p className="fda-error" role="alert">
            {message}
          </p>
        ) : null}

        <section className="fda-card">
          <div className="fda-actions" style={{ justifyContent: "space-between" }}>
            <div>
              <h2>{branch.isOpen ? t.settings.accepting : t.settings.closed}</h2>
              <p className="fda-muted">{branch.isOpen ? t.settings.acceptingHelp : t.settings.closedHelp}</p>
            </div>
            <button className={branch.isOpen ? "fda-btn fda-btn--line" : "fda-btn"} disabled={busy} onClick={() => {
                if (branch.isOpen && !window.confirm(t.settings.stopConfirm)) return;
                void run("/api/admin/branch", "PATCH", { isOpen: !branch.isOpen });
              }}
              type="button"
            >
              {branch.isOpen ? t.settings.stop : t.settings.start}
            </button>
          </div>
        </section>

        {canEdit ? (
          <>
            <form className="fda-card fda-form" onSubmit={submitBranch}>
              <h2>{t.settings.venue}</h2>
              <div className="fda-row-fields">
                <label>
                  {t.settings.nameEn}
                  <input className="fd-input" defaultValue={branch.name} maxLength={80} name="name" required />
                </label>
                <label>
                  {t.settings.nameAr}
                  <input className="fd-input" defaultValue={branch.nameAr ?? ""} dir="rtl" maxLength={80} name="nameAr" />
                </label>
              </div>
              <label>
                {t.settings.address}
                <input className="fd-input" defaultValue={branch.address} maxLength={200} name="address" />
              </label>
              <div className="fda-row-fields">
                <label>
                  {t.settings.phone}
                  <input className="fd-input" defaultValue={branch.phone} dir="ltr" maxLength={32} name="phone" />
                </label>
                <label>
                  {t.settings.currencyCode}
                  <input className="fd-input" defaultValue={branch.currency} dir="ltr" maxLength={3} name="currency" pattern="[A-Za-z]{3}" required title={t.settings.currencyHint} />
                </label>
              </div>
              <div>
                <button className="fda-btn" disabled={busy}>
                  {t.settings.saveVenue}
                </button>
              </div>
            </form>

            <section className="fda-card">
              <h2>{t.settings.payments}</h2>
              <p className="fda-muted">{t.settings.paymentsHelp}</p>
              {paymentMethods.map((method) => (
                <MethodForm busy={busy} key={method.id} method={method} onSubmit={(event) => submitMethod(event, method.id)} />
              ))}
              <h3>{t.settings.addMethod}</h3>
              <MethodForm busy={busy} onSubmit={(event) => submitMethod(event)} />
            </section>
          </>
        ) : null}
      </div>
    </>
  );
}

function MethodForm({ method, busy, onSubmit }: { method?: Method; busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const { t } = useAdmin();
  return (
    <form className="fda-form" onSubmit={onSubmit} style={{ paddingBlockStart: 14, borderBlockStart: "1px solid var(--c-line)" }}>
      <div className="fda-row-fields">
        <label>
          {t.settings.methodName}
          <input className="fd-input" defaultValue={method?.label} maxLength={80} name="label" required />
        </label>
        <label>
          {t.settings.methodNameAr}
          <input className="fd-input" defaultValue={method?.labelAr ?? ""} dir="rtl" maxLength={80} name="labelAr" />
        </label>
      </div>
      <div className="fda-row-fields">
        <label>
          {t.settings.type}
          <select className="fd-input" defaultValue={method?.type ?? "digital_wallet"} name="type">
            {Object.entries(t.settings.types).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t.settings.holder}
          <input className="fd-input" defaultValue={method?.accountName} maxLength={120} name="accountName" />
        </label>
        <label>
          {t.settings.number}
          <input className="fd-input" defaultValue={method?.phone} dir="ltr" maxLength={40} name="phone" />
        </label>
      </div>
      <div className="fda-row-fields">
        <label>
          {t.settings.instructions}
          <textarea className="fd-input" defaultValue={method?.details} maxLength={300} name="details" />
        </label>
        <label>
          {t.settings.instructionsAr}
          <textarea className="fd-input" defaultValue={method?.detailsAr ?? ""} dir="rtl" maxLength={300} name="detailsAr" />
        </label>
      </div>
      <div className="fda-actions">
        <label className="fda-check">
          <input defaultChecked={method?.isDefault} name="isDefault" type="checkbox" /> {t.settings.preselected}
        </label>
        {method ? (
          <label className="fda-check">
            <input defaultChecked={method.isActive} name="isActive" type="checkbox" /> {t.active}
          </label>
        ) : null}
        <button className="fda-btn fda-btn--soft" disabled={busy}>
          {method ? t.settings.saveMethod : t.settings.addMethodButton}
        </button>
      </div>
    </form>
  );
}
