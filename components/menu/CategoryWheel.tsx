"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { readStored, writeStored } from "./useCart";

export type WheelItem = { id: string; label: string };

const SLOT = 118; // distance between neighbouring names, in px
const REACH = 3; // names drawn on each side of the centre
const HINT_KEY = "fd_wheel_hint";

const mod = (value: number, size: number) => ((value % size) + size) % size;

// The only navigation: category names on a curved, floating wheel that never ends. Drag or flick it
// and it turns with a springy overshoot; whatever settles at the centre becomes the page. Tapping a
// name turns the wheel to it. Works with touch, mouse, trackpad and the arrow keys.
export default function CategoryWheel({
  items,
  value,
  label,
  hint,
  onSelect
}: {
  items: WheelItem[];
  value: string;
  label: string;
  hint: string;
  onSelect: (id: string) => void;
}) {
  const count = items.length;
  const stage = useRef<HTMLDivElement>(null);
  const slots = useRef<(HTMLSpanElement | null)[]>([]);
  const position = useRef(Math.max(0, items.findIndex((item) => item.id === value)));
  const target = useRef(position.current);
  const velocity = useRef(0);
  const dragging = useRef(false);
  const frame = useRef(0);
  const rtlRef = useRef(false);
  const latest = useRef({ items, value, onSelect });
  latest.current = { items, value, onSelect };
  const [current, setCurrent] = useState(items[mod(Math.round(position.current), count)]?.label ?? "");
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (count > 1 && !readStored<boolean>(HINT_KEY)) setShowHint(true);
  }, [count]);

  function dismissHint() {
    setShowHint(false);
    writeStored(HINT_KEY, true);
  }

  // Place the seven names for the current position (no React render per frame).
  function draw() {
    const x = position.current;
    const centre = Math.round(x);
    const sign = rtlRef.current ? -1 : 1;
    for (let k = -REACH; k <= REACH; k++) {
      const element = slots.current[k + REACH];
      if (!element) continue;
      const offset = centre + k - x;
      const distance = Math.abs(offset);
      const item = latest.current.items[mod(centre + k, count)];
      if (element.dataset.id !== item.id) {
        element.dataset.id = item.id;
        element.textContent = item.label;
      }
      const physical = offset * sign;
      const fade = Math.min(1, Math.max(0, REACH + 0.5 - distance));
      element.style.transform = `translate(calc(-50% + ${(physical * SLOT).toFixed(1)}px), ${(distance * distance * 12).toFixed(1)}px) rotate(${(physical * 9).toFixed(2)}deg) scale(${Math.max(0.86, 1.12 - distance * 0.14).toFixed(3)})`;
      element.style.opacity = String(Math.max(0, Math.min(fade, 1 - distance * 0.18)));
      element.setAttribute("data-active", String(distance < 0.5));
    }
    const name = latest.current.items[mod(centre, count)]?.label ?? "";
    setCurrent((previous) => (previous === name ? previous : name));
  }

  // The page follows the wheel the moment its destination is known, not when the spring has stopped.
  function commit() {
    const id = latest.current.items[mod(Math.round(target.current), count)]?.id;
    if (id && id !== latest.current.value) latest.current.onSelect(id);
  }

  function settle() {
    const id = latest.current.items[mod(Math.round(position.current), count)].id;
    if (id !== latest.current.value) latest.current.onSelect(id);
  }

  // A spring pulls the position to the target; it is a little underdamped, so it overshoots and
  // settles instead of stopping dead.
  function run() {
    cancelAnimationFrame(frame.current);
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      const force = 190 * (target.current - position.current) - 15 * velocity.current;
      velocity.current += force * dt;
      position.current += velocity.current * dt;
      draw();
      if (Math.abs(velocity.current) < 0.02 && Math.abs(target.current - position.current) < 0.002) {
        position.current = target.current;
        velocity.current = 0;
        draw();
        settle();
        return;
      }
      frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }

  useEffect(() => {
    rtlRef.current = stage.current ? getComputedStyle(stage.current).direction === "rtl" : false;
    draw();
    return () => cancelAnimationFrame(frame.current);
  }, []);

  // The page changed from outside (logo tap, back button): turn the wheel the short way round.
  useEffect(() => {
    const index = items.findIndex((item) => item.id === value);
    if (index < 0 || dragging.current) return;
    const here = mod(Math.round(target.current), count);
    if (index === here) return;
    const diff = mod(index - here + count / 2, count) - count / 2;
    target.current = Math.round(target.current) + diff;
    run();
  }, [value]);

  // Dragging, flicking and tapping.
  useEffect(() => {
    const element = stage.current;
    if (!element || count < 2) return;
    let lastX = 0;
    let lastT = 0;
    let startX = 0;
    let startT = 0;
    let wheelTimer = 0;
    const dir = () => (rtlRef.current ? -1 : 1);

    const down = (event: PointerEvent) => {
      dragging.current = true;
      cancelAnimationFrame(frame.current);
      element.setPointerCapture(event.pointerId);
      lastX = startX = event.clientX;
      lastT = startT = performance.now();
      velocity.current = 0;
    };
    const move = (event: PointerEvent) => {
      if (!dragging.current) return;
      const now = performance.now();
      const dx = event.clientX - lastX;
      if (Math.abs(event.clientX - startX) > 6) dismissHint();
      position.current -= dx / (SLOT * dir());
      const instant = -dx / (SLOT * dir()) / Math.max(0.001, (now - lastT) / 1000);
      velocity.current = velocity.current * 0.6 + instant * 0.4;
      lastX = event.clientX;
      lastT = now;
      draw();
    };
    const up = (event: PointerEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      const moved = Math.abs(event.clientX - startX);
      if (moved < 6 && performance.now() - startT < 400) {
        // A tap: turn to the name that was touched.
        const rect = element.getBoundingClientRect();
        const steps = Math.round(((event.clientX - (rect.left + rect.width / 2)) / SLOT) * dir());
        target.current = Math.round(position.current) + steps;
        velocity.current = 0;
        if (steps !== 0) dismissHint();
      } else {
        const flick = Math.max(-4, Math.min(4, velocity.current * 0.22));
        target.current = Math.round(position.current + flick);
      }
      commit();
      run();
    };
    const wheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      dismissHint();
      cancelAnimationFrame(frame.current);
      position.current += (event.deltaX / SLOT) * dir() * 0.9;
      draw();
      window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(() => {
        target.current = Math.round(position.current);
        velocity.current = 0;
        commit();
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
  }, [count]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    dismissHint();
    const forward = (event.key === "ArrowRight") !== rtlRef.current;
    target.current = Math.round(target.current) + (forward ? 1 : -1);
    commit();
    run();
  }

  return (
    <nav aria-label={label} className="fd-wheel">
      <span aria-hidden="true" className="fd-wheel-dot" />
      <div
        aria-label={label}
        aria-orientation="horizontal"
        aria-valuemax={count - 1}
        aria-valuemin={0}
        aria-valuenow={mod(Math.round(position.current), count)}
        aria-valuetext={current}
        className="fd-wheel-stage"
        onKeyDown={onKeyDown}
        ref={stage}
        role="slider"
        tabIndex={0}
      >
        {Array.from({ length: REACH * 2 + 1 }, (_, slot) => (
          <span aria-hidden="true" className="fd-wheel-item" key={slot} ref={(element) => void (slots.current[slot] = element)} />
        ))}
      </div>
      {showHint ? (
        <span aria-hidden="true" className="fd-wheel-hint" title={hint}>
          <Icon name="chevron" size={18} />
          <Icon name="chevron" size={18} />
        </span>
      ) : null}
    </nav>
  );
}
