"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import Stepper from "@/components/ui/Stepper";
import { formatPrice, localized, numberFormat, text, type Lang } from "@/lib/i18n";
import type { ProductView } from "@/types/menu";
import Icon from "@/components/ui/Icon";
import type { CartLine } from "./useCart";

const EASE = "cubic-bezier(0.32, 0.72, 0, 1)"; // a sheet's usual curve: quick start, soft landing, no overshoot
const DURATION = 300;
const DISMISS_DISTANCE = 110; // px dragged down that closes the sheet
const DISMISS_SPEED = 0.6; // px per ms of a downward flick that closes it

// The item opens as a bottom sheet over a dimmed page: a square photo on top, the details below,
// everything fitting the screen. It closes by the close button, a tap on the dimmed page, a drag
// or flick down on the handle or photo, the Escape key, or the phone's back button.
export default function ItemDetail({
  product,
  lang,
  currency,
  canOrder,
  inOrder,
  open,
  placeholder,
  onAdd,
  onClose,
  onExited
}: {
  product: ProductView;
  lang: Lang;
  currency: string;
  canOrder: boolean;
  inOrder: number;
  open: boolean;
  placeholder: string | null;
  onAdd: (line: CartLine) => void;
  onClose: () => void;
  onExited: () => void;
}) {
  const t = text(lang);
  const scrim = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const drag = useRef({ active: false, startY: 0, lastY: 0, lastT: 0, speed: 0 });
  const [ready, setReady] = useState(false);
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? "");
  const [addOnIds, setAddOnIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);

  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useLayoutEffect(() => {
    if (reduced()) return;
    const options: KeyframeAnimationOptions = { duration: DURATION, easing: EASE, fill: "backwards" };
    scrim.current?.animate([{ opacity: 0 }, { opacity: 1 }], options);
    sheet.current?.animate([{ transform: "translateY(100%)" }, { transform: "translateY(0)" }], options);
  }, []);

  // Closing slides the sheet away, then lets the app drop it.
  useEffect(() => {
    if (open) return;
    const element = sheet.current;
    if (!element || reduced()) return onExited();
    const options: KeyframeAnimationOptions = { duration: 240, easing: "ease-in", fill: "forwards" };
    scrim.current?.animate([{ opacity: 1 }, { opacity: 0 }], options);
    const out = element.animate([{ transform: `translateY(${Math.max(0, drag.current.lastY - drag.current.startY)}px)` }, { transform: "translateY(100%)" }], options);
    out.finished.then(onExited, onExited);
  }, [open]);

  useEffect(() => {
    closeButton.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // The page behind does not scroll while the sheet is open.
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = previous;
    };
  }, [onClose]);

  // Drag the handle or the photo down to dismiss.
  function onPointerDown(event: React.PointerEvent) {
    drag.current = { active: true, startY: event.clientY, lastY: event.clientY, lastT: performance.now(), speed: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event: React.PointerEvent) {
    const state = drag.current;
    if (!state.active || !sheet.current) return;
    const now = performance.now();
    const offset = Math.max(0, event.clientY - state.startY);
    state.speed = (event.clientY - state.lastY) / Math.max(1, now - state.lastT);
    state.lastY = event.clientY;
    state.lastT = now;
    sheet.current.style.transform = `translateY(${offset}px)`;
    if (scrim.current) scrim.current.style.opacity = String(Math.max(0, 1 - offset / 420));
  }
  function onPointerUp() {
    const state = drag.current;
    if (!state.active || !sheet.current) return;
    state.active = false;
    const offset = Math.max(0, state.lastY - state.startY);
    if (offset > DISMISS_DISTANCE || state.speed > DISMISS_SPEED) return onClose();
    // Not far enough: settle back.
    sheet.current.animate([{ transform: `translateY(${offset}px)` }, { transform: "translateY(0)" }], { duration: 220, easing: EASE });
    sheet.current.style.transform = "";
    if (scrim.current) scrim.current.style.opacity = "";
    state.lastY = state.startY;
  }

  const variant = product.variants.find((item) => item.id === variantId);
  const addOns = product.addOns.filter((addOn) => addOnIds.includes(addOn.id));
  const unit = product.priceCents + (variant?.priceDelta ?? 0) + addOns.reduce((sum, addOn) => sum + addOn.priceCents, 0);
  const number = numberFormat(lang);
  const name = localized(lang, product.nameEn, product.nameAr);
  const description = localized(lang, product.description, product.descriptionAr);

  function toggleAddOn(id: string) {
    setAddOnIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <div aria-label={name} aria-modal="true" className="fd-sheet-root" role="dialog">
      <div className="fd-scrim" onClick={onClose} ref={scrim} />
      <div className="fd-sheet" ref={sheet}>
        <div className="fd-grab" onPointerCancel={onPointerUp} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
          <span />
        </div>
        <div className="fd-sheet-photo" onPointerCancel={onPointerUp} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
          {product.imageUrl ? (
            <>
              {placeholder ? <img alt="" height={900} src={placeholder} width={900} /> : null}
              <img alt="" className="fd-hi" data-ready={ready} decoding="async" fetchPriority="high" height={900} onLoad={() => setReady(true)} src={product.imageUrl} width={900} />
            </>
          ) : (
            <div aria-hidden="true" className="fd-detail-empty">
              <Icon name="cone" size={72} />
            </div>
          )}
          <IconButton className="fd-close" label={t.close} onClick={onClose} ref={closeButton} tone="soft">
            <Icon name="close" />
          </IconButton>
        </div>

        <div className="fd-detail-scroll">
          <div className="fd-detail-head">
            <h2>{name}</h2>
            <div className="fd-detail-price">
              <span className="fd-price">{product.isAvailable ? formatPrice(product.priceCents, currency, lang) : t.soldOut}</span>
              {inOrder > 0 ? (
                <span aria-label={`${t.inOrder}: ${number.format(inOrder)}`} className="fd-count">
                  {number.format(inOrder)}
                </span>
              ) : null}
            </div>
          </div>
          {description ? <p className="fd-desc">{description}</p> : null}

          {product.variants.length ? (
            <fieldset className="fd-group">
              <legend>{t.sizes}</legend>
              <div className="fd-opts">
                {product.variants.map((item) => (
                  <label className="fd-opt" key={item.id}>
                    <input checked={variantId === item.id} name="variant" onChange={() => setVariantId(item.id)} type="radio" />
                    <span>{localized(lang, item.name, item.nameAr)}</span>
                    <small>{formatPrice(product.priceCents + item.priceDelta, currency, lang)}</small>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          {product.addOns.length ? (
            <fieldset className="fd-group">
              <legend>{t.extras}</legend>
              {product.addOns.map((addOn) => {
                const on = addOnIds.includes(addOn.id);
                const label = localized(lang, addOn.name, addOn.nameAr);
                return (
                  <div className="fd-extra" key={addOn.id}>
                    <span className="fd-extra-text">
                      <span>{label}</span>
                      <small>+{formatPrice(addOn.priceCents, currency, lang)}</small>
                    </span>
                    <Button aria-label={`${on ? t.addedExtra : t.addExtra}: ${label}`} aria-pressed={on} className="fd-extra-btn" live={false} onClick={() => toggleAddOn(addOn.id)} variant={on ? "primary" : "soft"}>
                      {on ? <Icon name="check" size={18} /> : null}
                      {on ? t.addedExtra : t.addExtra}
                    </Button>
                  </div>
                );
              })}
            </fieldset>
          ) : null}
        </div>

        <div className="fd-detail-foot">
          <Stepper label={t.quantity} lang={lang} min={1} onChange={(delta) => setQuantity((value) => Math.max(1, Math.min(25, value + delta)))} quantity={quantity} />
          <Button disabled={!canOrder || !product.isAvailable} onClick={() => onAdd({ productId: product.id, variantId: variant?.id, addOnIds, quantity })}>
            {t.add}
            <span className="fd-sep" />
            {formatPrice(unit * quantity, currency, lang)}
          </Button>
        </div>
      </div>
    </div>
  );
}
