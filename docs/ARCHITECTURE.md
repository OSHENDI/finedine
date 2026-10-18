# Architecture

One Next.js 16 app (App Router, React 19, TypeScript) with a Postgres database. No Server Actions:
the browser talks to route handlers under `app/api`. Domain logic lives in `src/server` and `lib`
and does not depend on Next, so the stack can change later (see `docs/history/AUDIT-2026-10.md`,
section 10, for the decision to stay on Next).

## Folders

| Folder | Holds |
| --- | --- |
| `app/` | Routes only: pages, `api/` handlers, `layout.tsx`, the three stylesheets, icons, fonts |
| `components/customer/` | The customer single-page app: `MenuApp` (shell and history), screens, item sheet, carousel, wheel, splash, `useCart` |
| `components/admin/` | Staff screens: shell, orders board, menu editor, tables, settings, staff, login |
| `components/ui/` | Shared pieces: `Button`, `IconButton`, `Stepper`, `TextField`, `CheckoutBar`, `Icon` |
| `lib/` | Helpers: i18n (customer and staff dictionaries), phone numbers, cart cookie, image shrinking, schemas, auth, events, rate limit, uploads |
| `src/db/` | Drizzle schema, database client, migration runner |
| `src/server/store.ts` | All database reads and writes (also re-exported by `lib/store.ts`) |
| `drizzle/` | SQL migrations (`npm run db:generate` creates one from the schema) |
| `scripts/` | Operations: `migrate.mjs`, `local.mjs` (production build on this machine), `reset-db.mjs` |
| `tests/` | `integration.ts`, `migrations-test.ts`, `postgres-test.ts`, `fixtures/` |
| `public/` | Intro video and poster, logo |
| `docs/` | This file, `DEPLOY.md`, `history/` |

Not in the repository: `design-source/` (the intro animation project, the source video and the
original font files; git-ignored on purpose).

## How a request flows

- **Customer.** `/`, `/m/[slug]`, `/t/[code]` and `/order/[token]` all render `MenuApp` on the server
  with the menu, the language (cookie `fd_lang`) and the saved order (cookies `fd_cart_<branch>`,
  `fd_order_<branch>`). After that the app is one page: screens are state plus history entries.
- **Order.** `POST /api/public/orders` (multipart: JSON plus an optional receipt image). The server
  prices everything from the database, never from the browser, and returns a tracking token.
- **Live status.** Customers and staff hold a Server-Sent Events stream. A change publishes a
  `NOTIFY` on Postgres, every app instance re-emits it locally, and the browser re-fetches.
- **Staff.** `/login` sets a signed session cookie (`finedine_session`, 8 hours). Every API call
  re-checks the user, role and password stamp against the database.

## Data

Tables: `businesses`, `branches`, `users`, `categories`, `menu_items`, `item_variants`,
`item_add_ons`, `payment_methods`, `qr_codes`, `orders`, `audit_logs`, `rate_limits`, `uploads`.
Every staff query is scoped by `business_id`. Order lines are snapshots (names and prices at the
time of the order, in both languages). Menu photos and payment receipts are rows in `uploads`.

## Languages and numbers

Arabic is the default, English is the alternative, never mixed in one line. Customer text is in
`lib/i18n.ts`, staff text in `lib/i18n-admin.ts`. Digits are Latin in both languages; money reads
"29 شيكل" or "ILS 29". Phone numbers are stored as 10 digits starting with 05 (`lib/phone.ts`).

## Table codes

A table QR opens `/t/k7q3-xm9d-4trb`: 12 base32 characters derived from the QR row id with
`QR_TOKEN_SECRET`. Only a hash is stored. Changing the secret invalidates printed codes.

## Checks

`npm run typecheck`, `npm run lint`, `npm run test:integration` (in-memory database),
`npm run build`. `.github/workflows/ci.yml` runs all four on every push, and on `main` also publishes the built site to the `release` branch, which Render deploys (see `docs/DEPLOY.md`).
