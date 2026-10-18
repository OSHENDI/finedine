"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { formatPrice, localized, type Lang } from "@/lib/i18n";
import type { ProductView } from "@/types/menu";
import Confetti from "./Confetti";
import { ItemControls, ProductPhoto } from "./ProductRow";

const TURN = 0.66; // radians between neighbouring cards on the curve
const GAP = 8; // px between neighbouring cards
const REACH = 3; // cards drawn on each side of the centre
const AUTOPLAY = 3200; // ms between automatic turns
const PAUSE = 3000; // ms autoplay waits after the customer touches the strip

const mod = (value: number, size: number) => ((value % size) + size) % size;

// Home: the most ordered items on a concave strip, like the inside of a ring. The centred card
// faces the customer, the neighbours show as half cards curving toward them, and the strip fades
// into the page at both edges. It drags (touch or mouse), flicks, takes arrow keys and the mouse
// wheel, never ends, and turns by itself until the customer engages with it. The name, price and
// add control below follow the centred card.
export default function ConcaveCarousel({
  products,
  lang,
  currency,
  ordersOpen,
  quantities,
  paused,
  title,
  onOpen,
  onStep
}: {
  products: ProductView[];
  lang: Lang;
  currency: string;
  ordersOpen: boolean;
  quantities: Map<string, number>;
  paused: boolean;
  title: string;
  onOpen: (product: ProductView) => void;
  onStep: (product: ProductView, delta: number) => void;
}) {
  const count = products.length;
  const stage = useRef<HTMLDivElement>(null);
  const cards = useRef(new Map<number, HTMLElement>());
  const position = useRef(0);
  const target = useRef(0);
  const velocity = useRef(0);
  const dragging = useRef(false);
  const frame = useRef(0);
  const touched = useRef(0);
  const directionSign = useRef(1);
  const latestPaused = useRef(paused);
  latestPaused.current = paused;
  const [base, setBase] = useState(0);

  const draw = useCallback(() => {
    const element = stage.current;
    if (!element) return;
    const x = position.current;
    const centre = Math.round(x);
    const first = cards.current.values().next().value as HTMLElement | undefined;
    const width = first?.offsetWidth || 240;
    // Chosen so the neighbour's near edge sits GAP px from the centre card's edge once it is turned.
    const radius = ((width / 2) * (1 + Math.cos(TURN)) + GAP) / Math.sin(TURN);
    cards.current.forEach((card, index) => {
      const offset = index - x;
      const distance = Math.abs(offset);
      const reach = Math.max(-REACH, Math.min(REACH, offset));
      const angle = reach * TURN;
      const sideways = radius * Math.sin(angle) * directionSign.current;
      const forward = radius * (1 - Math.cos(angle));
      card.style.transform = `translate3d(${sideways.toFixed(1)}px, 0, ${forward.toFixed(1)}px) rotateY(${(-angle * directionSign.current * (180 / Math.PI)).toFixed(2)}deg)`;
      card.style.opacity = String(Math.max(0, Math.min(1, REACH + 0.4 - distance) * (1 - Math.max(0, distance - 1.4) * 0.25)));
      card.style.zIndex = String(100 - Math.round(distance * 10));
    });
    setBase((previous) => (previous === centre ? previous : centre));
  }, []);

  // A critically-damped spring pulls the position to the target: it eases in and out, with no bounce.
  const run = useCallback(() => {
    cancelAnimationFrame(frame.current);
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      const force = 95 * (target.current - position.current) - 19 * velocity.current;
      velocity.current += force * dt;
      position.current += velocity.current * dt;
      draw();
      if (Math.abs(velocity.current) < 0.01 && Math.abs(target.current - position.current) < 0.001) {
        position.current = target.current;
        velocity.current = 0;
        draw();
        return;
      }
      frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }, [draw]);

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    directionSign.current = getComputedStyle(element).direction === "rtl" ? -1 : 1;
    draw();
    window.addEventListener("resize", draw);
    return () => {
      window.removeEventListener("resize", draw);
      cancelAnimationFrame(frame.current);
    };
  }, [draw]);

  // Cards that just mounted (a new neighbour came into reach) get their place at once.
  useEffect(() => draw(), [base, draw]);

  // Dragging, flicking, the mouse wheel.
  useEffect(() => {
    const element = stage.current;
    if (!element || count < 2) return;
    let lastX = 0;
    let lastT = 0;
    let startX = 0;
    let moved = false;
    let wheelTimer = 0;
    const stepPx = () => ((cards.current.values().next().value as HTMLElement | undefined)?.offsetWidth ?? 240) + GAP;

    const down = (event: PointerEvent) => {
      dragging.current = true;
      moved = false;
      touched.current = Date.now();
      cancelAnimationFrame(frame.current);
      lastX = startX = event.clientX;
      lastT = performance.now();
      velocity.current = 0;
    };
    const move = (event: PointerEvent) => {
      if (!dragging.current) return;
      if (!moved && Math.abs(event.clientX - startX) > 6) {
        moved = true;
        element.setPointerCapture(event.pointerId);
      }
      if (!moved) return;
      const now = performance.now();
      const dx = event.clientX - lastX;
      position.current -= (dx / stepPx()) * directionSign.current;
      velocity.current = velocity.current * 0.6 + ((-dx / stepPx()) * directionSign.current / Math.max(0.001, (now - lastT) / 1000)) * 0.4;
      lastX = event.clientX;
      lastT = now;
      touched.current = Date.now();
      draw();
    };
    const up = () => {
      if (!dragging.current) return;
      dragging.current = false;
      touched.current = Date.now();
      if (!moved) return;
      const flick = Math.max(-3, Math.min(3, velocity.current * 0.2));
      target.current = Math.round(position.current + flick);
      run();
    };
    const wheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      touched.current = Date.now();
      cancelAnimationFrame(frame.current);
      position.current += (event.deltaX / stepPx()) * directionSign.current;
      draw();
      window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(() => {
        target.current = Math.round(position.current);
        velocity.current = 0;
        run();
      }, 110);
    };

    element.addEventListener("pointerdown", down);
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", up);
    element.addEventListener("pointercancel", up);
    element.addEventListener("wheel", wheel, { passive: false });
    return () => {
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", up);
      element.removeEventListener("pointercancel", up);
      element.removeEventListener("wheel", wheel);
      window.clearTimeout(wheelTimer);
    };
  }, [count, draw, run]);

  // Autoplay: turn to the next card every few seconds, unless the customer is using the strip
  // (it waits three seconds after the last touch), the tab is hidden, an item is open, or the
  // customer asked for less motion.
  useEffect(() => {
    if (count < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (latestPaused.current || document.hidden || dragging.current || Date.now() - touched.current < PAUSE) return;
      target.current = Math.round(target.current) + 1;
      run();
    }, AUTOPLAY);
    return () => window.clearInterval(timer);
  }, [count, run]);

  function turnTo(index: number) {
    touched.current = Date.now();
    target.current = index;
    run();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const forward = (event.key === "ArrowRight") === (directionSign.current === 1);
    turnTo(Math.round(target.current) + (forward ? 1 : -1));
  }

  const current = products[mod(base, count)];
  if (!current) return null;
  const name = localized(lang, current.nameEn, current.nameAr);
  const indexes = Array.from({ length: REACH * 2 + 1 }, (_, slot) => base - REACH + slot);

  return (
    <div className="fd-home" onFocusCapture={() => (touched.current = Date.now())} onPointerDownCapture={() => (touched.current = Date.now())} onPointerMoveCapture={() => (touched.current = Date.now())}>
      <Confetti />
      <h1 className="fd-home-title">
        {title.split(" ").slice(0, -1).join(" ")} <em>{title.split(" ").slice(-1)}</em>
      </h1>
      <div aria-label={name} className="fd-car" onKeyDown={onKeyDown} ref={stage} role="group" tabIndex={0}>
        {indexes.map((index) => {
          const product = products[mod(index, count)];
          return (
            <div
              className="fd-slide"
              data-idx={index}
              key={index}
              ref={(card) => {
                if (card) cards.current.set(index, card);
                else cards.current.delete(index);
              }}
              style={{ opacity: 0 } as CSSProperties}
            >
              <button
                aria-label={localized(lang, product.nameEn, product.nameAr)}
                className="fd-slide-photo"
                data-photo={product.id}
                onClick={() => (index === Math.round(position.current) ? onOpen(product) : turnTo(index))}
                type="button"
              >
                <ProductPhoto priority={index === 0} product={product} sizes="(max-width: 520px) 58vw, 260px" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="fd-pick" key={current.id}>
        <p className="fd-pick-name fd-enter">{name}</p>
        <div className="fd-pick-foot fd-enter" style={{ "--i": 1 } as CSSProperties}>
          {current.isAvailable ? <span className="fd-price">{formatPrice(current.priceCents, currency, lang)}</span> : null}
          <ItemControls canOrder={ordersOpen} lang={lang} onOpen={onOpen} onStep={onStep} product={current} quantity={quantities.get(current.id) ?? 0} />
        </div>
      </div>
    </div>
  );
}
