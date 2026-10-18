"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { orderCookie, writeCookie } from "@/lib/cart-cookie";
import { fill, formatPrice, localized, localizeTable, numberFormat, plainNumber, text, type Lang } from "@/lib/i18n";
import Icon from "@/components/ui/Icon";

type Progress = "confirmed" | "accepted" | "preparing" | "ready" | "done" | "cancelled";

export type TrackedOrder = {
  orderNumber: number;
  progress: Progress;
  awaitingPayment: boolean;
  firstName: string;
  tableLabel: string | null;
  cancelReason: string | null;
  totalCents: number;
  currency: string;
  note: string | null;
  paymentLabel: string;
  paymentLabelAr: string | null;
  items: { name: string; nameAr: string | null; quantity: number; unitCents: number; options: string[]; optionsAr: string[] }[];
};

const steps = ["confirmed", "accepted", "preparing", "ready", "done"] as const;

export default function TrackScreen({
  token,
  branchSlug,
  initial,
  lang,
  onMenu
}: {
  token: string;
  branchSlug: string;
  initial: TrackedOrder;
  lang: Lang;
  onMenu: () => void;
}) {
  const [order, setOrder] = useState(initial);
  const [offline, setOffline] = useState(false);
  const [gone, setGone] = useState(false);
  const [open, setOpen] = useState(false);
  const lastProgress = useRef(initial.progress);
  const finished = order.progress === "done" || order.progress === "cancelled";
  const t = text(lang);

  useEffect(() => {
    if (!finished) return;
    // The order is over: the menu no longer needs to offer a "track your order" shortcut.
    writeCookie(orderCookie(branchSlug), null);
  }, [finished, branchSlug]);

  useEffect(() => {
    if (finished) return;
    async function refresh() {
      if (document.visibilityState === "hidden") return;
      try {
        const response = await fetch(`/api/public/orders/${token}`, { cache: "no-store" });
        if (response.status === 404) return setGone(true);
        if (!response.ok) return;
        const next = (await response.json()) as TrackedOrder;
        setOffline(false);
        setOrder(next);
        if (next.progress === "ready" && lastProgress.current !== "ready") navigator.vibrate?.([200, 100, 200]);
        lastProgress.current = next.progress;
      } catch {
        setOffline(true);
      }
    }
    // The server pushes a "change" event; the slow poll only covers a dropped connection.
    const source = new EventSource(`/api/public/orders/${token}/events`);
    source.addEventListener("change", refresh);
    const timer = window.setInterval(refresh, 20_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      source.close();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [token, finished]);

  const number = numberFormat(lang);
  const activeIndex = steps.indexOf(order.progress as (typeof steps)[number]);
  const headline =
    order.progress === "confirmed" ? (order.awaitingPayment ? t.headline.checking : t.headline.received) : t.headline[order.progress === "done" ? "done" : order.progress];
  const detail =
    order.progress === "ready"
      ? order.tableLabel
        ? fill(t.readyTable, { table: localizeTable(order.tableLabel, lang) })
        : fill(t.readyName, { name: order.firstName })
      : null;

  const comma = lang === "ar" ? "، " : ", ";

  return (
    <section className="fd-screen" role="main">
      <div aria-live="polite" className="fd-status-card" data-state={order.progress}>
        <div className="fd-status-meta">
          <span>
            {t.orderNumber} <bdi>#{plainNumber(lang, order.orderNumber)}</bdi>
          </span>
          {order.tableLabel ? <span>{localizeTable(order.tableLabel, lang)}</span> : null}
        </div>
        {order.progress === "ready" ? (
          <span className="fd-bell">
            <Icon name="bell" size={28} />
          </span>
        ) : null}
        <h2>{headline}</h2>
        {detail ? <p>{detail}</p> : null}
        {order.progress === "cancelled" ? (
          <>
            {order.cancelReason ? <p>{order.cancelReason}</p> : null}
            <p>{t.cancelledHelp}</p>
          </>
        ) : null}

        <span aria-hidden="true" className="fd-divider" />
        <Button aria-controls="fd-order-details" aria-expanded={open} className="fd-details-toggle" onClick={() => setOpen((value) => !value)} variant="quiet">
          {open ? t.hideDetails : t.showDetails}
          <Icon className="fd-details-chevron" name="chevron" size={18} />
        </Button>
        <div className="fd-details" data-open={open} id="fd-order-details">
          <div>
            <ul className="fd-details-lines">
              {order.items.map((line, index) => (
                <li key={index}>
                  <span>
                    <span>
                      <bdi>{number.format(line.quantity)}</bdi> × {localized(lang, line.name, line.nameAr)}
                    </span>
                    {(lang === "ar" ? line.optionsAr : line.options).length ? <small>{(lang === "ar" ? line.optionsAr : line.options).join(comma)}</small> : null}
                  </span>
                  <span>{formatPrice(line.unitCents * line.quantity, order.currency, lang)}</span>
                </li>
              ))}
            </ul>
            <dl className="fd-details-facts">
              <div>
                <dt>{t.paidWith}</dt>
                <dd>{localized(lang, order.paymentLabel, order.paymentLabelAr)}</dd>
              </div>
              {order.note ? (
                <div>
                  <dt>{t.yourNote}</dt>
                  <dd>{order.note}</dd>
                </div>
              ) : null}
              <div className="fd-details-total">
                <dt>{t.total}</dt>
                <dd>{formatPrice(order.totalCents, order.currency, lang)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {order.progress === "cancelled" ? null : (
        <ol className="fd-timeline">
          {steps.map((step, index) => {
            const state = index < activeIndex || order.progress === "done" ? "done" : index === activeIndex ? "current" : "upcoming";
            return (
              <li className="fd-step" data-state={state} key={step}>
                <span className="fd-step-dot">{state === "done" ? <Icon name="check" size={20} /> : number.format(index + 1)}</span>
                <div>
                  <strong>{t.status[step]}</strong>
                  {state === "current" ? <small>{step === "confirmed" && order.awaitingPayment ? t.headline.checking : t.statusHelp[step]}</small> : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {offline ? <p className="fd-help">{t.reconnecting}</p> : null}
      {gone ? <p className="fd-error">{t.notFoundOrder}</p> : null}

      <div className="fd-sticky-cta">
        <Button block onClick={onMenu} variant="soft">
          {t.backToMenu}
        </Button>
      </div>
    </section>
  );
}
