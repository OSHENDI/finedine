# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 16 (App Router, route handlers, no Server Actions), React 19, TypeScript, Drizzle ORM on PostgreSQL (embedded PGlite in development). Decided and recorded in docs/history/AUDIT-2026-10.md, section 10. Customer screens are mobile-first web pages opened from a QR code; no native app.

## Users

- **Customers** at a restaurant, café, bar or dessert shop. They scan a table or branch QR code with the phone camera, browse the menu, order, pay, and wait at their table. Mostly Arabic speakers in Palestine (currency ILS, phone numbers +970), some English speakers. One hand on the phone, often in dim light, on venue Wi-Fi or mobile data.
- **Staff** (owner, manager, staff) who run the venue from the admin screens: take orders as they arrive, check payment receipts, prepare and hand over orders, edit the menu and the QR sheet. Separate from the customer design work.

## Product Purpose

Let a venue take table orders and payments directly, without third-party commissions or an app install. The customer orders and pays; the venue verifies the payment and prepares the order; the customer sees progress live. Success: the customer places an order in under a minute, nobody has to flag down a waiter, and the venue never prepares an order whose payment was not confirmed.

## Positioning

A universal QR ordering tool for any venue, with manual payment verification (wallet or bank receipt) that works where card processors are unavailable, built for Arabic first and English as an equal alternative.

## Operating Context

- Orders come from a table QR code (the table name is attached automatically) or a branch QR code or link.
- Payment methods are set by the venue: pay at the table or counter, wallet (PalPay), Jawwal Pay, bank transfer. There is no card payment. Transfers need the sender phone, a reference and a receipt photo; staff confirm the receipt before the kitchen starts.
- Order status the customer sees: received, accepted, preparing, ready, done (or cancelled with a reason). Updates arrive live.
- Languages: Arabic and English are separate experiences with a language switch, never mixed in one line. Arabic is right to left.
- Menu photos, names (both languages), prices, variants and add-ons are edited by the venue in the admin screens.

## Capabilities and Constraints

- Built and working: menu, cart, checkout with payment methods and receipt upload, order tracking, live updates, admin orders, menu editor with photo upload, payment method editor, tables and printable QR sheet, staff accounts.
- Not built and not to be faked in the interface: sales tax or service charge, estimated preparation time, "call the waiter", card payment, shared open bill per table. If any is wanted it is a product decision first.
- Open decision: whether a table shares one open bill (several people add items, pay together or separately) or each checkout stays its own order, as it is today. Treat each checkout as its own order until decided.
- Open decision: whether the pink-and-amber look is the product's own identity or one venue's theme that other venues can replace.

## Brand Commitments

- Typeface: Thmanyah Sans, three weights (regular, bold, black) as WOFF2 subsets in `app/fonts/`, supplied by the owner.
- Palette supplied by the owner (primary pink #cd3266, secondary amber #e3971c, accent crimson #d52a4f, warm cream background #faf7ea, warm brown text) with a light token set only (the app has no dark mode) and pink-to-amber, pink-to-crimson and amber-to-crimson gradients. Cheerful ice-cream-shop feel in the spirit of a well-known ice-cream chain, not its exact colors or logo.
- Reference screenshots from another product are inspiration for the page structure only and must not be copied.

## Evidence on Hand

- Demo data in the seed (a café with coffee, desserts and juices) is synthetic. Real venue names, photos and prices are not provided.
- Four reference screens supplied by the owner (menu list, cart, checkout, order status) show the intended page structure. Product photos in the references belong to another product and are not reusable.

## Product Principles

- The menu comes first: no marketing banner between the scan and the food.
- The language switch changes the whole screen; no screen shows two languages at once.
- Every control does what its label says; nothing in the interface promises a feature that does not exist.
- A customer who loses connection or closes the page can always get back to their order.
- Payment is verified by a person before preparation starts, and the interface says so plainly.

## Accessibility & Inclusion

Right-to-left layout is a first-class mode, not a mirrored afterthought. Touch targets of at least 44 px, text contrast of at least 4.5:1 on the cream ground, and a visible keyboard focus ring. Numbers use Latin digits (0 to 9) in both languages. Arabic is the default language; a saved choice overrides it.
