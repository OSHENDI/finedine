"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import CheckoutBar from "@/components/ui/CheckoutBar";
import TextField from "@/components/ui/TextField";
import { shrinkImage } from "@/lib/image";
import { formatPrice, localized, text, type Lang } from "@/lib/i18n";
import { formatMobile, normalizeMobile } from "@/lib/phone";
import type { BranchView, PaymentMethodView } from "@/types/menu";
import Icon from "@/components/ui/Icon";
import { readStored, writeStored, type CartEntry } from "./useCart";

// Arabic keyboards type Arabic-Indic digits; numbers are kept as Latin digits.
const latin = (value: string) => value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
const validName = (value: string) => value.replace(/ /g, "").length >= 3;
// A bank or wallet operation number is 8 or 9 digits.
const validReference = (value: string) => /^[0-9]{8,9}$/.test(value);

const payIcon: Record<string, string> = { cash_or_card: "cash", digital_wallet: "wallet", bank: "bank", other: "receipt" };

// crypto.randomUUID only exists on HTTPS and localhost; fall back so testing over a LAN address works.
function newKey() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    return (char === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}

// Payment in four short steps: your name, how you pay, and for a transfer the number you paid
// from plus the operation number or a photo of the receipt. The table comes from the QR code.
export default function CheckoutScreen({
  lang,
  branch,
  qrToken,
  tableLabel,
  entries,
  totalCents,
  note,
  paymentMethods,
  onBack,
  onSuccess
}: {
  lang: Lang;
  branch: BranchView;
  qrToken?: string | null;
  tableLabel: string | null;
  entries: CartEntry[];
  totalCents: number;
  note: string;
  paymentMethods: PaymentMethodView[];
  onBack: () => void;
  onSuccess: (trackingToken: string) => void | Promise<void>;
}) {
  const t = text(lang);
  const defaultMethod = paymentMethods.find((method) => method.isDefault) ?? paymentMethods[0];
  const [name, setName] = useState("");
  const [methodId, setMethodId] = useState(defaultMethod?.id ?? "");
  const [senderPhone, setSenderPhone] = useState("");
  const [reference, setReference] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  // One key per checkout: a retry after a dropped connection returns the same order, not a duplicate.
  const idempotencyKey = useRef<string | null>(null);

  const method = paymentMethods.find((item) => item.id === methodId);
  const needsTransfer = Boolean(method) && method?.type !== "cash_or_card";
  const money = formatPrice(totalCents, branch.currency, lang);

  // The account number as the venue wrote it, shown as 059-123-4567 and copied as 0591234567.
  const accountDigits = method ? normalizeMobile(method.phone) : null;
  const accountShown = accountDigits ? formatMobile(accountDigits) : (method?.phone ?? "");
  const accountCopy = accountDigits ?? (method?.phone ?? "").replace(/[^0-9]/g, "");

  const nameBad = !validName(name);
  const senderBad = needsTransfer && !normalizeMobile(senderPhone);
  const referenceBad = needsTransfer && reference !== "" && !validReference(reference);
  const proofBad = needsTransfer && reference === "" && !receipt;
  const show = (field: string, bad: boolean) => bad && (tried || touched[field]);
  const touch = (field: string) => setTouched((current) => ({ ...current, [field]: true }));

  useEffect(() => {
    const saved = readStored<{ name?: string }>("fd_customer");
    if (saved?.name) setName(saved.name);
  }, []);

  useEffect(() => {
    if (!receipt) return setPreview(null);
    const url = URL.createObjectURL(receipt);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [receipt]);

  async function pickReceipt(file: File | undefined) {
    setReceipt(file ? await shrinkImage(file, 1600, 0.85) : null);
  }

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(accountCopy);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard is unavailable on plain http; the number stays visible to copy by hand
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!entries.length || submitting || !method) return;
    if (nameBad || senderBad || referenceBad || proofBad) {
      setTried(true);
      return void event.currentTarget.querySelector<HTMLElement>("[aria-invalid='true'], [data-proof='true']")?.focus();
    }
    setError(null);
    setSubmitting(true);
    idempotencyKey.current ??= newKey();

    const [firstName, ...rest] = name.trim().split(/\s+/);
    const sender = normalizeMobile(senderPhone) ?? "";
    const payload = {
      idempotencyKey: idempotencyKey.current,
      qrToken,
      branchSlug: branch.slug,
      firstName,
      lastName: rest.join(" "),
      customerPhone: needsTransfer ? sender : "",
      tableLabel: tableLabel ?? "",
      note: note.trim(),
      paymentMethodId: method.id,
      transferFromPhone: needsTransfer ? sender : null,
      transferReference: needsTransfer ? reference : null,
      items: entries.map((entry) => ({
        productId: entry.line.productId,
        variantId: entry.line.variantId,
        addOnIds: entry.line.addOnIds,
        quantity: entry.line.quantity
      }))
    };

    const body = new FormData();
    body.set("order", JSON.stringify(payload));
    if (needsTransfer && receipt) body.set("receipt", receipt);

    let response: Response;
    try {
      response = await fetch("/api/public/orders", { method: "POST", body });
    } catch {
      setSubmitting(false);
      return setError(t.noConnection);
    }
    if (!response.ok) {
      setSubmitting(false);
      const message = ((await response.json().catch(() => null)) as { error?: string } | null)?.error;
      return setError((message && t.errors[message]) || t.couldNotSend);
    }
    const result = (await response.json()) as { trackingToken: string };
    writeStored("fd_customer", { name: name.trim() });
    // The button stays busy until the order screen takes over, so a second tap cannot send it twice.
    await onSuccess(result.trackingToken);
  }

  if (entries.length === 0) {
    return (
      <section className="fd-screen">
        <div className="fd-empty-cart">
          <span className="fd-hero-icon">
            <Icon name="order" size={36} />
          </span>
          <strong>{t.emptyCart}</strong>
          <Button onClick={onBack} variant="soft">
            {t.backToMenu}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <form className="fd-screen" noValidate onSubmit={submit}>
      <div className="fd-screen-head">
        <h2>{t.completeOrder}</h2>
      </div>

      <div className="fd-stack">
        <TextField
          autoComplete="name"
          error={show("name", nameBad) ? t.nameInvalid : undefined}
          label={t.yourName}
          maxLength={80}
          onBlur={() => touch("name")}
          onChange={(event) => setName(event.target.value)}
          value={name}
        />

        <fieldset className="fd-group">
          <legend className="fd-section-title">{t.payment}</legend>
          <div className="fd-pays">
            {paymentMethods.map((item) => (
              <label className="fd-pay" key={item.id}>
                <input checked={methodId === item.id} name="payment" onChange={() => setMethodId(item.id)} type="radio" />
                <span className="fd-pay-icon">
                  <Icon name={payIcon[item.type] ?? "receipt"} />
                </span>
                <span className="fd-pay-text">
                  <strong>{localized(lang, item.label, item.labelAr)}</strong>
                </span>
                <span aria-hidden="true" className="fd-radio" />
              </label>
            ))}
          </div>
        </fieldset>
        {paymentMethods.length === 0 ? <p className="fd-error">{t.noPayment}</p> : null}

        {needsTransfer && method ? (
          <div className="fd-transfer">
            <div className="fd-account">
              <div>
                <small>{method.accountName || t.accountHolder}</small>
                <strong>{accountShown}</strong>
              </div>
              <Button className="fd-copy" onClick={copyNumber} variant="quiet">
                <Icon name={copied ? "check" : "copy"} size={18} />
                {copied ? t.copied : t.copy}
              </Button>
            </div>

            <TextField
              dir="ltr"
              error={show("sender", senderBad) ? t.phoneInvalid : undefined}
              inputMode="numeric"
              label={t.transferPhone}
              maxLength={12}
              onBlur={() => touch("sender")}
              onChange={(event) => {
                const raw = latin(event.target.value);
                setSenderPhone(normalizeMobile(raw) ?? raw.replace(/[^0-9]/g, "").slice(0, 10));
              }}
              placeholder="05X-XXX-XXXX"
              value={formatMobile(senderPhone)}
            />

            <TextField
              dir="ltr"
              error={show("reference", referenceBad) ? t.refInvalid : undefined}
              inputMode="numeric"
              label={t.transferRef}
              maxLength={9}
              onBlur={() => touch("reference")}
              onChange={(event) => setReference(latin(event.target.value).replace(/[^0-9]/g, "").slice(0, 9))}
              value={reference}
            />

            <div className="fd-field">
              {t.receipt}
              {preview ? <img alt={t.receipt} className="fd-receipt-preview" src={preview} /> : null}
              <div className="fd-file">
                <label data-proof={show("proof", proofBad) ? "true" : "false"} tabIndex={-1}>
                  <Icon name="upload" size={20} />
                  {receipt ? t.changeReceipt : t.chooseReceipt}
                  <input accept="image/png,image/jpeg,image/webp" className="fd-sr" onChange={(event) => void pickReceipt(event.target.files?.[0])} type="file" />
                </label>
              </div>
              {show("proof", proofBad) ? (
                <span className="fd-field-error" role="alert">
                  {t.proofNeeded}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="fd-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <CheckoutBar amount={money} label={t.total}>
        <Button block disabled={submitting || !method || entries.length === 0} onClick={() => setTried(true)} type="submit">
          {submitting ? t.sending : t.confirm}
        </Button>
      </CheckoutBar>
    </form>
  );
}
