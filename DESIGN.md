---
name: FineDine Customer Ordering
description: A warm ice-cream-parlour ordering counter in cherry pink and amber, Arabic-first and bidirectional, on a cream ground. Flat surfaces separated by hairlines, soft light on coloured controls.
colors:
  text-50: "#f7f0ee"
  text-100: "#efe1dc"
  text-200: "#dfc3b9"
  text-300: "#cfa596"
  text-400: "#bf8773"
  text-500: "#af6950"
  text-600: "#8c5440"
  text-700: "#693f30"
  text-800: "#462a20"
  text-900: "#231510"
  text-950: "#110b08"
  background-50: "#faf7ea"
  background-100: "#f6efd5"
  background-200: "#ecdfac"
  background-300: "#e3cf82"
  background-400: "#d9c059"
  background-500: "#d0b02f"
  background-600: "#a68d26"
  background-700: "#7d691c"
  background-800: "#534613"
  background-900: "#2a2309"
  background-950: "#151205"
  primary-50: "#faeaf0"
  primary-100: "#f5d6e0"
  primary-200: "#ebadc2"
  primary-300: "#e184a3"
  primary-400: "#d75b84"
  primary-500: "#cd3266"
  primary-600: "#a42851"
  primary-700: "#7b1e3d"
  primary-800: "#521429"
  primary-900: "#290a14"
  primary-950: "#15050a"
  secondary-50: "#fcf5e8"
  secondary-100: "#f9ead2"
  secondary-200: "#f4d5a4"
  secondary-300: "#eec077"
  secondary-400: "#e9ac49"
  secondary-500: "#e3971c"
  secondary-600: "#b67916"
  secondary-700: "#885a11"
  secondary-800: "#5b3c0b"
  secondary-900: "#2d1e06"
  secondary-950: "#170f03"
  accent-50: "#fbeaed"
  accent-100: "#f7d4dc"
  accent-200: "#eeaab9"
  accent-300: "#e67f95"
  accent-400: "#dd5572"
  accent-500: "#d52a4f"
  accent-600: "#aa223f"
  accent-700: "#80192f"
  accent-800: "#551120"
  accent-900: "#2b0810"
  accent-950: "#150408"
  ok-green: "#1f7a4d"
  surface-white: "#ffffff"
---

# Design System: FineDine

Scope: the customer app (`components/customer`, `components/ui`, `app/customer.css`) and the staff screens
(`components/admin`, `app/admin.css`). Shared tokens and resets are in `app/base.css`. All styles live
under the `.fd` scope; staff classes start with `fda-`, customer classes with `fd-`.

## Feel

A cheerful ice-cream counter, used with one hand on a phone, often in dim light, in Arabic (right to
left) or English (left to right) from one stylesheet. Light theme only: there is no dark mode.
Reference screens from other products were inspiration for page structure only; palette and look are the
owner's own.

## Colour

The owner's palette: five 50-to-950 scales (text, background, primary cherry pink, secondary amber,
accent crimson), listed above. Components use role tokens, never raw scale steps:

- `--c-bg` cream page (background-50), `--c-surface` white, `--c-soft` butter (background-100)
- `--c-ink` text-900, `--c-ink-soft` text-600
- `--c-primary` primary-500, `--c-primary-text` primary-600 (pink text on cream), `--c-on-primary` white
- `--c-danger` accent-600, `--c-ok` green (the transient "added" state and finished orders)
- Gradients run along the line of reading, start edge to end edge (mirrored in Arabic):
  `--grad-primary-accent` is the main button; `--grad-primary-secondary` marks a ready order.

## Type

Thmanyah Sans, three weights served as WOFF2 subsets (`app/fonts`): regular (300 to 500), bold (600, 700),
black (800, 900). Form controls use it too. Sizes: page title 30, item name 17, body 16, small 14. Arabic
lines are looser (1.7). Names are never wrapped, shrunk or cut with an ellipsis: item names are capped at
24 characters so they always fit. Digits are Latin in both languages. Money reads "29 شيكل" or "ILS 29".

## Surfaces and depth

- **No borders, no drop shadows, no pills.** Tone separates surfaces: white or butter on cream.
- **Hairline** (`--rule`): a 1 px line that fades out at both ends separates rows, order lines, payment
  options and staff sections. It replaces boxes.
- Rounded shapes only where something is a control (buttons 16, fields 12 to 16, size choices) or the one
  hero (the order status card, 20). Icon buttons are circles.
- Inner light, not outer shadow: the floating order bar uses inset highlights; the order status card has
  a faint glow just inside its edges.

## Motion

One standard curve (quick start, soft landing, no overshoot), 180 to 320 ms. Nothing bounces. Rows rise
in one after another (capped at six). Coloured buttons lift very slightly in brightness and colour every
few seconds (an opacity-only overlay) over a still grain. The home background shapes wander slowly
(30 to 60 s loops, transform only). Everything stops under reduced motion.

## Customer screens

- **One page.** `MenuApp` holds home, categories, item, order, payment and status as states with history
  entries; nothing reloads. The intro video plays first and the app rises as it fades.
- **Navigation is the category wheel**: a floating curved panel, endless, springy, driven by drag, flick,
  tap, trackpad or arrow keys. The page changes the moment its destination is known. A two-arrow hint shows
  until the first use, then never again. The logo returns to Home.
- **Home** is a concave carousel (three cards in view, 8 px gaps, soft edge fade, endless, auto-turning
  every 3.2 s and paused 3 s after any touch) over slowly wandering pastel rings and arcs, under a large
  two-tone title.
- **Lists** are borderless rows: photo, name on one line, price, and an add control.
- **Quantity** is the `Stepper`: "+" left, the number, then "x" (remove) at one or "-" above one, in the
  same order in both languages. An item with sizes or extras shows its count as a badge on the add button.
- **Item view** is a bottom sheet over a dimmed page: handle, square photo, details that fit without
  scrolling, extras as "Add" buttons that show the price they add. Close by button, tap outside, drag or
  flick down, Escape or back.
- **Order and payment** screens pin the total above the action. Payment asks only for a name, how you pay
  and, for a transfer, the number you paid from plus an operation number (8 or 9 digits) or a receipt photo.
  Numbers show as 059-123-4567 and are stored and copied as 0591234567.
- **Order status** is a card (number, headline, "Show details" for items, payment, note, total) above a
  five-step progress list with a still halo on the current step.
- The words are "order", never "cart". Controls appear only when their state exists (the order button and
  bar only once something was added).

## Staff screens (Operate)

Scanability and consistency first. A rail on desktop, a scrolling tab bar on phones; the current page is
marked by a bar. Sections are separated by hairlines. Orders are tickets with one filled action; confirming
a payment is its own step; destructive actions ask first. Same palette, type and language switch as the
customer app.

## Shared components (`components/ui`)

`Button` (primary, soft, quiet), `IconButton`, `Stepper`, `TextField`, `CheckoutBar`, `Icon` (one outline
set, 24 px grid, direction-sensitive icons mirror in Arabic). A repeated control is a component, not a copy.

## Rules

- **Do** show one language per screen, format numbers through `lib/i18n.ts`, use logical CSS properties.
- **Do** keep touch targets at 44 px, text contrast at 4.5:1, a visible focus ring, and honour reduced motion.
- **Do** use role tokens and the `--rule` hairline; reach for a shared component before writing a new control.
- **Don't** add borders, drop shadows, pills, gradient text, bounce, or boxes inside boxes.
- **Don't** promise what does not exist: no tax, tips, favourites, search, call-waiter, card payment or ETA.
