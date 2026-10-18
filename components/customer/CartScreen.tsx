"use client";

import type { CSSProperties } from "react";
import Button from "@/components/ui/Button";
import CheckoutBar from "@/components/ui/CheckoutBar";
import Stepper from "@/components/ui/Stepper";
import { formatPrice, text, type Lang } from "@/lib/i18n";
import Icon from "@/components/ui/Icon";
import { ProductPhoto } from "./ProductRow";
import type { CartEntry } from "./useCart";

// The open order: what was added, a note for the kitchen, the total and the way on to payment.
export default function CartScreen({
  lang,
  currency,
  entries,
  totalCents,
  note,
  onNote,
  onQuantity,
  onClear,
  onBack,
  onContinue
}: {
  lang: Lang;
  currency: string;
  entries: CartEntry[];
  totalCents: number;
  note: string;
  onNote: (value: string) => void;
  onQuantity: (key: string, delta: number) => void;
  onClear: () => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const t = text(lang);

  return (
    <section className="fd-screen" role="main">
      <div className="fd-screen-head">
        <h2>{t.yourCart}</h2>
        {entries.length ? (
          <Button onClick={onClear} variant="quiet">
            {t.clear}
          </Button>
        ) : null}
      </div>

      {entries.length === 0 ? (
        <div className="fd-empty-cart">
          <span className="fd-hero-icon">
            <Icon name="order" size={36} />
          </span>
          <strong>{t.emptyCart}</strong>
          <Button onClick={onBack} variant="soft">
            {t.backToMenu}
          </Button>
        </div>
      ) : (
        <>
          <ul className="fd-lines">
            {entries.map((entry, index) => (
              <li className="fd-line" key={entry.key} style={{ "--i": index } as CSSProperties}>
                <span className="fd-line-photo">
                  <ProductPhoto product={entry.product} sizes="72px" />
                </span>
                <div className="fd-line-text">
                  <span className="fd-name">{entry.name}</span>
                  {entry.detail ? <small>{entry.detail}</small> : null}
                  <div className="fd-row-foot">
                    <span className="fd-price">{formatPrice(entry.unitCents * entry.line.quantity, currency, lang)}</span>
                    <Stepper label={entry.name} lang={lang} onChange={(delta) => onQuantity(entry.key, delta)} quantity={entry.line.quantity} size="sm" />
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <label className="fd-field">
            <span className="fd-sr">{t.kitchenNotes}</span>
            <textarea className="fd-input" maxLength={240} onChange={(event) => onNote(event.target.value)} placeholder={t.kitchenNotes} value={note} />
          </label>

          <CheckoutBar amount={formatPrice(totalCents, currency, lang)} label={t.total}>
            <Button block onClick={onContinue}>
              {t.continuePay}
            </Button>
          </CheckoutBar>
        </>
      )}
    </section>
  );
}
