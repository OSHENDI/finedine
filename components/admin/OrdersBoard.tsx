"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useAdmin } from "@/components/admin/AdminFrame";
import PageHead from "@/components/admin/PageHead";
import Icon from "@/components/ui/Icon";
import { fillText } from "@/lib/i18n-admin";
import { localizeTable } from "@/lib/i18n";

type TicketItem = {
  name: string;
  nameAr?: string;
  quantity: number;
  unitCents: number;
  selectedVariant: { name: string; nameAr?: string } | null;
  selectedAddOns: Array<{ name: string; nameAr?: string; priceCents: number }>;
};

type OrderRow = {
  id: string;
  orderNumber: number;
  status: string;
  customerName: string;
  customerPhone: string;
  tableLabel: string | null;
  note: string | null;
  totalCents: number;
  paymentMethodLabel: string;
  paymentMethodLabelAr: string | null;
  paymentStatus: string;
  transferFromPhone: string;
  transferReference: string;
  hasReceipt: boolean;
  cancelReason: string | null;
  items: TicketItem[];
  createdAt: string;
};

type Filter = "open" | "payment" | "new" | "kitchen" | "ready" | "closed";

// The one forward step staff take from each status. Skipping ahead is still allowed by the API.
const nextStep: Record<string, { status: string; key: "accept" | "startPreparing" | "markReady" | "handOver" } | undefined> = {
  new: { status: "accepted", key: "accept" },
  accepted: { status: "preparing", key: "startPreparing" },
  preparing: { status: "ready", key: "markReady" },
  ready: { status: "completed", key: "handOver" }
};

const isClosed = (order: OrderRow) => order.status === "completed" || order.status === "cancelled";
const needsPayment = (order: OrderRow) => !isClosed(order) && order.paymentStatus === "pending_review";

const inFilter: Record<Filter, (order: OrderRow) => boolean> = {
  open: (order) => !isClosed(order),
  payment: needsPayment,
  new: (order) => order.status === "new" && !needsPayment(order),
  kitchen: (order) => order.status === "accepted" || order.status === "preparing",
  ready: (order) => order.status === "ready",
  closed: isClosed
};

type Reasoning = { id: string; kind: "cancel" | "reject" } | null;

export default function OrdersBoard({ currency, orders }: { currency: string; orders: OrderRow[] }) {
  const router = useRouter();
  const { t, lang, money, number, plain } = useAdmin();
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<string | null>(null);
  const [printOrderId, setPrintOrderId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reasoning, setReasoning] = useState<Reasoning>(null);
  const [reasonText, setReasonText] = useState("");
  const [receiptsOpen, setReceiptsOpen] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("open");
  const [alertsOn, setAlertsOn] = useState(false);
  const seenOrderIds = useRef<Set<string> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Live updates: the server pushes a "change" event, the page refetches. The slow poll only
  // covers a dropped connection or a missed event.
  useEffect(() => {
    let debounce: number | undefined;
    const refresh = () => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(() => router.refresh(), 250);
    };
    const source = new EventSource("/api/admin/events");
    source.addEventListener("change", refresh);
    const fallback = window.setInterval(() => router.refresh(), 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(debounce);
      window.clearInterval(fallback);
      document.removeEventListener("visibilitychange", onVisible);
      source.close();
    };
  }, [router]);

  // Browsers only allow sound and screen wake locks after a tap, so staff turn alerts on once per shift.
  async function requestWakeLock() {
    try {
      wakeLockRef.current = (await navigator.wakeLock?.request("screen")) ?? null;
    } catch {
      // not supported or denied: alerts still work
    }
  }

  async function enableAlerts() {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (AudioCtor) {
      audioRef.current ??= new AudioCtor();
      await audioRef.current.resume();
      chime(audioRef.current);
    }
    await requestWakeLock();
    setAlertsOn(true);
  }

  useEffect(() => {
    if (!alertsOn) return;
    // The lock is released when the tab is hidden; take it again when staff come back.
    const again = () => {
      if (document.visibilityState === "visible") void requestWakeLock();
    };
    document.addEventListener("visibilitychange", again);
    return () => document.removeEventListener("visibilitychange", again);
  }, [alertsOn]);

  const newCount = orders.filter((order) => order.status === "new").length;
  useEffect(() => {
    document.title = newCount ? `(${newCount}) ${t.orders.title} - ${t.brand}` : `${t.orders.title} - ${t.brand}`;
  }, [newCount, t]);

  useEffect(() => {
    const currentIds = new Set(orders.map((order) => order.id));
    if (!seenOrderIds.current) {
      seenOrderIds.current = currentIds;
      return;
    }
    const hasNewOrder = orders.some((order) => !seenOrderIds.current?.has(order.id));
    seenOrderIds.current = currentIds;
    if (!hasNewOrder) return;
    if (audioRef.current?.state === "running") chime(audioRef.current);
  }, [orders]);

  async function send(orderId: string, body: Record<string, string>) {
    setActive(orderId);
    setErrors((current) => ({ ...current, [orderId]: "" }));
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const message = ((await response.json().catch(() => null)) as { error?: string } | null)?.error;
        setErrors((current) => ({ ...current, [orderId]: message ?? t.orders.couldNotUpdate }));
      } else {
        setReasoning(null);
        setReasonText("");
      }
    } catch {
      setErrors((current) => ({ ...current, [orderId]: t.noConnection }));
    }
    startTransition(() => router.refresh());
    setActive(null);
  }

  function toggleReceipt(orderId: string) {
    setReceiptsOpen((current) => {
      const next = new Set(current);
      if (!next.delete(orderId)) next.add(orderId);
      return next;
    });
  }

  function printTicket(orderId: string) {
    setPrintOrderId(orderId);
    window.setTimeout(() => {
      window.print();
      setPrintOrderId(null);
    }, 50);
  }

  const counts = useMemo(() => {
    const result = {} as Record<Filter, number>;
    (Object.keys(inFilter) as Filter[]).forEach((key) => (result[key] = orders.filter(inFilter[key]).length));
    return result;
  }, [orders]);

  // Waiting orders oldest first, so nobody is overlooked; finished orders newest first.
  const shown = useMemo(() => {
    const list = orders.filter(inFilter[filter]);
    const direction = filter === "closed" ? -1 : 1;
    return [...list].sort((a, b) => direction * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
  }, [orders, filter]);

  const filters: Array<{ key: Filter; label: string }> = [
    { key: "open", label: t.orders.filterOpen },
    { key: "payment", label: t.orders.filterPayment },
    { key: "new", label: t.orders.filterNew },
    { key: "kitchen", label: t.orders.filterKitchen },
    { key: "ready", label: t.orders.filterReady },
    { key: "closed", label: t.orders.filterClosed }
  ];

  return (
    <>
      <PageHead page="orders" />

      {alertsOn ? null : (
        <div className="fda-alerts fda-noprint">
          <div>
            <strong>{t.orders.alertsOff}</strong>
            <span className="fda-muted">{t.orders.alertsHelp}</span>
          </div>
          <button className="fda-btn" onClick={enableAlerts} type="button">
            <Icon name="bell" size={20} />
            {t.orders.turnOn}
          </button>
        </div>
      )}

      <div className="fda-filters fda-noprint" role="group">
        {filters.map((item) => (
          <button aria-pressed={filter === item.key} className="fda-chip" key={item.key} onClick={() => setFilter(item.key)} type="button">
            {item.label}
            <b>{number(counts[item.key])}</b>
          </button>
        ))}
      </div>

      <section aria-live="polite" className="fda-tickets">
        {shown.length === 0 ? <p className="fda-muted">{t.orders.empty}</p> : null}
        {shown.map((order) => {
          const step = nextStep[order.status];
          const checkPayment = needsPayment(order);
          const busy = pending || active === order.id;
          const asking = reasoning?.id === order.id ? reasoning : null;
          // Staff read recency: time only for today's orders, the date as well for older ones.
          const created = new Date(order.createdAt);
          const isToday = created.toDateString() === new Date().toDateString();
          const when = created.toLocaleString("en-GB", isToday ? { timeStyle: "short" } : { dateStyle: "short", timeStyle: "short" });
          return (
            <article className="fda-ticket" data-closed={isClosed(order)} data-print={printOrderId === order.id} key={order.id}>
              <div className="fda-ticket-head">
                <div>
                  <h3>
                    <bdi>#{plain(order.orderNumber)}</bdi> {order.customerName}
                  </h3>
                  <div className="fda-ticket-meta">
                    <span>{when}</span>
                    {order.customerPhone ? <bdi dir="ltr">{order.customerPhone}</bdi> : null}
                  </div>
                </div>
                <span className="fda-pill" data-tone={order.status}>
                  {t.orders.status[order.status as keyof typeof t.orders.status] ?? order.status}
                </span>
              </div>

              {order.tableLabel ? (
                <div>
                  <span className="fda-table-tag">
                    <Icon name="table" size={18} />
                    {localizeTable(order.tableLabel, lang)}
                  </span>
                </div>
              ) : null}

              <ul className="fda-items">
                {order.items.map((item, index) => (
                  <li key={`${order.id}-${item.name}-${index}`}>
                    <div>
                      <strong>
                        {number(item.quantity)} × {lang === "ar" && item.nameAr ? item.nameAr : item.name}
                      </strong>
                      {item.selectedVariant || item.selectedAddOns.length ? (
                        <small>
                          {[
                            item.selectedVariant ? (lang === "ar" && item.selectedVariant.nameAr ? item.selectedVariant.nameAr : item.selectedVariant.name) : null,
                            ...item.selectedAddOns.map((addOn) => `+ ${lang === "ar" && addOn.nameAr ? addOn.nameAr : addOn.name}`)
                          ]
                            .filter(Boolean)
                            .join(lang === "ar" ? "، " : ", ")}
                        </small>
                      ) : null}
                    </div>
                    <span>{money(item.unitCents * item.quantity, currency)}</span>
                  </li>
                ))}
              </ul>
              {order.note ? (
                <p>
                  <strong>{t.orders.note}:</strong> {order.note}
                </p>
              ) : null}

              <div className="fda-pay">
                <div className="fda-actions">
                  <strong>{money(order.totalCents, currency)}</strong>
                  <span className="fda-muted">
                    {t.orders.via} {lang === "ar" && order.paymentMethodLabelAr ? order.paymentMethodLabelAr : order.paymentMethodLabel}
                  </span>
                  <span className="fda-pill" data-tone={order.paymentStatus}>
                    {t.orders.payment[order.paymentStatus as keyof typeof t.orders.payment] ?? order.paymentStatus}
                  </span>
                </div>
                {order.transferReference ? (
                  <span className="fda-muted">
                    {t.orders.transferPhone}: <bdi dir="ltr">{order.transferFromPhone}</bdi>
                    <br />
                    {t.orders.reference}: <bdi dir="ltr">{order.transferReference}</bdi>
                  </span>
                ) : null}
                {order.hasReceipt ? (
                  <div className="fda-noprint">
                    <button aria-expanded={receiptsOpen.has(order.id)} className="fda-btn fda-btn--line" onClick={() => toggleReceipt(order.id)} type="button">
                      <Icon name="receipt" size={20} />
                      {receiptsOpen.has(order.id) ? t.orders.hideReceipt : t.orders.viewReceipt}
                    </button>
                    {receiptsOpen.has(order.id) ? (
                      <a href={`/api/admin/orders/${order.id}/receipt`} rel="noreferrer" target="_blank">
                        {/* a plain img: the receipt is a login-protected file, not an optimisable asset */}
                        <img alt={fillText(t.orders.receiptAlt, { number: order.orderNumber })} className="fda-receipt" loading="lazy" src={`/api/admin/orders/${order.id}/receipt`} />
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {order.cancelReason ? <p className="fda-error">{fillText(t.orders.cancelledWith, { reason: order.cancelReason })}</p> : null}
              {errors[order.id] ? (
                <p className="fda-error" role="alert">
                  {errors[order.id]}
                </p>
              ) : null}

              {asking ? (
                <div className="fda-form fda-noprint">
                  <label>
                    {asking.kind === "reject" ? t.orders.askReject : t.orders.askCancel}
                    <input autoFocus className="fd-input" maxLength={200} onChange={(event) => setReasonText(event.target.value)} value={reasonText} />
                  </label>
                  <div className="fda-actions">
                    <button
                      className="fda-btn fda-btn--danger"
                      disabled={busy}
                      onClick={() => send(order.id, asking.kind === "reject" ? { paymentStatus: "rejected", cancelReason: reasonText } : { status: "cancelled", cancelReason: reasonText })}
                      type="button"
                    >
                      {asking.kind === "reject" ? t.orders.rejectPayment : t.orders.cancelOrder}
                    </button>
                    <button className="fda-btn fda-btn--soft" onClick={() => setReasoning(null)} type="button">
                      {t.back}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="fda-actions fda-noprint">
                  {checkPayment ? (
                    <>
                      <button className="fda-btn" disabled={busy} onClick={() => send(order.id, { paymentStatus: "verified" })} type="button">
                        {t.orders.verified}
                      </button>
                      <button className="fda-btn fda-btn--line" disabled={busy} onClick={() => (setReasoning({ id: order.id, kind: "reject" }), setReasonText(""))} type="button">
                        {t.orders.rejectPayment}
                      </button>
                    </>
                  ) : null}
                  {step && !checkPayment ? (
                    <button className="fda-btn" disabled={busy} onClick={() => send(order.id, { status: step.status })} type="button">
                      {t.orders[step.key]}
                    </button>
                  ) : null}
                  {!isClosed(order) && !checkPayment ? (
                    <button className="fda-btn fda-btn--line" disabled={busy} onClick={() => (setReasoning({ id: order.id, kind: "cancel" }), setReasonText(""))} type="button">
                      {t.orders.cancelOrder}
                    </button>
                  ) : null}
                  <button aria-label={t.orders.print} className="fda-btn fda-btn--soft" onClick={() => printTicket(order.id)} type="button">
                    <Icon name="printer" size={20} />
                    {t.orders.print}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </section>
    </>
  );
}

function chime(audio: AudioContext) {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.frequency.value = 880;
  oscillator.type = "sine";
  gain.gain.setValueAtTime(0.001, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, audio.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.35);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.38);
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
