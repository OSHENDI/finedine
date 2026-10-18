# FineDine Audit and Implementation Plan

Date: 2026-10-15. Scope: full read of all source (about 3,600 lines), plus typecheck, lint, integration test and production build run in a scratch copy (your folder was not touched). Findings marked **[verified]** were reproduced on a running build. Findings marked **[code]** come from reading the code only.

## 1. Verdict

**Rating: 4/10 as a product, 6/10 as a code base.**

The code is tidy, typed, small, and builds clean. The foundations (tenant scoping, hashed tokens, Zod validation, magic-byte upload check) are better than most MVPs. But the product's core loop is **broken at its most important step**: a customer uploads a payment receipt, and the admin has no way to see it. The "orders arrive instantly" promise is a 12-second poll. The customer's tracking link is lost on refresh. Nothing is deployable safely as-is.

Checks run in the scratch copy:

| Check | Result |
|---|---|
| `tsc --noEmit` | pass |
| `eslint .` | pass |
| `npm run test:integration` | pass (happy path only) |
| `next build` | pass, 15 s total, 4.4 s compile |
| Total client JS, all routes | 671 KB raw, about 200 KB gzip. Per-route first-load not measured. |

## 2. Is Next.js the problem?

**No. Do not rewrite.** The build is fast, the whole client bundle across every route is about 200 KB gzip, and the app is 3.6k lines. Next is not what makes this slow or unreliable. The real weaknesses are:

1. Polling instead of push (the actual cause of "not fast").
2. Receipts on local disk.
3. A database that boots and migrates itself on first request.
4. No tests beyond one happy path.

The honest cost of Next here is operational: a Node server, a heavier Docker image, and the Node-only PGlite setup. If you want a lighter stack later, the realistic choices are **Hono or Fastify for the API plus a small Preact or Svelte customer menu**. That is a 2-3 week rewrite that fixes none of the problems above by itself. Fix the problems first. Revisit the framework only if measured customer-page load on a real phone over 4G is bad.

## 3. Critical (fix before any real restaurant uses it)

**C1. Admin cannot see the receipt. [code, confirmed by grep]**
Receipts are written to `.uploads/receipts/` and nothing ever reads them. The admin card shows only the original filename (`components/OrdersBoard.tsx:116`). The product's trust model (verify payment by receipt) does not work. Needs an authenticated route that streams the file, tenant-checked, plus an image viewer in the order card.

**C2. Demo owner with a public password is created on first run in any environment. [verified]**
On an empty DB, `runInitAndSeed` inserts `owner@finedine.local` / `FineDine123!` (`src/server/store.ts:69`) and the login page pre-fills it. Login with it returned 200 on a fresh production build. Anyone who finds a deployed instance with an empty DB owns it. Seed only when `NODE_ENV !== "production"` or behind an explicit `SEED_DEMO=true`.

**C3. Receipts are lost or never saved in Docker. [code]**
- Container runs as user `nextjs`, but `/app` is root-owned. `mkdir .uploads` fails with EACCES, which the route reports as "Invalid receipt image" (400). Every bank or wallet order fails.
- Even if writable, container disks are ephemeral. Receipts vanish on redeploy.
- `.uploads` is not in `.gitignore`. SYSTEM_MAP says it is. Customer payment screenshots could be committed.
- `Dockerfile` copies `/app/public`, but no `public/` directory exists. The Docker build will fail at that line.
Use S3-compatible object storage (R2, S3, Backblaze) and store only the key.

**C4. Unauthenticated admin API calls return 500, not 401. [verified]**
`requireSession()` throws and no route catches it. `PATCH /api/admin/orders/<id>` without a cookie returned 500 and logged a stack trace. Not exploitable, but it pollutes logs and breaks the documented contract. Return 401.

**C5. Every branch's QR code encodes the demo token. [code]**
`getQrTokenForBranch` returns the hard-coded `demoQrToken` for any branch that has an active QR (`store.ts:232`). Only the hash is stored, so the real token cannot be recovered. A second tenant's printed QR would open the demo cafe's menu and place orders there. Generate the token at QR creation, show it once, or store it encrypted.

**C6. `AUTH_SECRET` falls back to a public default. [code]**
`lib/auth.ts:8`. If the env var is missing in production, anyone can forge an admin JWT. Throw at startup in production instead of defaulting. Your local `.env` has a custom 53-char value, which is fine.

**C7. Staff can do anything an owner can. [code]**
Role is in the JWT but never checked. Any `staff` user can change item prices. Add role checks to item and (future) settings routes.

## 4. High (core experience and correctness)

**H1. Order numbers can collide under load. [code, not reproduced]**
`max(order_number)+1` runs outside a transaction (`store.ts:421`). I fired 8 concurrent orders at PGlite and got 1001..1008 cleanly, but PGlite serialises queries. On real Postgres with a 10-connection pool, two simultaneous orders can read the same max, and the second hits the `UNIQUE(branch_id, order_number)` constraint and returns a 500. Fix: per-branch counter row updated with `UPDATE ... RETURNING` inside the same transaction as the insert.

**H2. Order creation is not transactional. [code]**
The order insert and the audit-log insert are separate statements. A failure between them, or between the receipt write and the order insert, leaves orphan files or unlogged orders. Wrap in `db.transaction`. Delete the stored receipt if the DB insert fails.

**H3. Ticket item names are chosen by the customer. [verified]**
`createOrder` stores `name: submittedItem.name` from the request. I sent `"HACKED NAME"` and it appeared on the admin orders page. Worse, an Arabic-speaking customer sends the Arabic name, so the kitchen sees Arabic or English depending on each customer's toggle. Use the DB name. Show both languages to staff if wanted.

**H4. Variants and add-ons are matched by display name. [code]**
If an owner renames "Large" or two add-ons share a name, orders silently price wrong or drop the option. Unknown variant names are silently ignored. Send IDs, and reject unknown IDs with 400.

**H5. No order state machine. [code]**
Any status can be set to any status, including `completed` back to `new` (`/api/admin/orders/[id]` accepts all six). Payment verification is a side effect of "accepted" (`store.ts:342`), not an explicit step. Add allowed transitions, an explicit "payment verified / rejected" action, and a reason field for cancellations.

**H6. Customer loses the tracking link. [code]**
The tracking token lives only in React state (`MenuClient.tsx:37`). Refresh, switch apps to open the bank app to pay, or lock the phone, and it is gone. For a flow that requires leaving the page to pay, this is a serious UX gap. Persist the order token in `localStorage`, redirect to `/order/[token]` immediately after submit, and show "active order" on the menu.

**H7. The customer is never told "ready, come get it".**
`ready` is mapped to `preparing` (`store.ts:489`). The last meaningful step, "your order is ready at table X or under name Y", which you described as the end of the flow, does not exist on the customer side. The stepper also shows raw words like `confirmed`, `accepted`, no Arabic, and the order page is English-only even though the menu is bilingual.

**H8. "Real-time" is 12-second polling that re-renders the whole server page. [code]**
`router.refresh()` every 12 s re-runs the page and all DB queries for every open admin tab. The chime plays only after the next poll, so a kitchen can wait up to 12 s plus. The audio context is also created per chime, and browsers block audio until the first user interaction, so a kitchen tablet that was just opened will be **silent** until someone taps. Use Server-Sent Events (simple, works on any host) or Postgres `LISTEN/NOTIFY`, add an "enable sound" button, a wake-lock, and visible flashing for unseen orders.

**H9. Rate limiting is weak. [code]**
- Key is the raw `x-forwarded-for` header, which any client can set. Rotating it bypasses all limits (login brute force included).
- In-memory only: resets on restart, not shared across instances.
- The map is never cleaned, so it grows forever (slow memory leak).
- A cash-at-counter order needs no receipt and no phone, so anyone can flood the kitchen with fake orders. Needs table-bound QR tokens, a per-QR cooldown, and Turnstile/hCaptcha on counter payments.

**H10. Receipt abuse and duplicate payment fraud. [code]**
A checksum is stored but never compared, so the same receipt can be reused on many orders. Transfer reference is free text and unchecked. At minimum: reject duplicate checksum or duplicate reference per branch, and flag it in the admin UI.

## 5. Medium

- **M1. Search only searches the selected category.** `categoryId` always has a value, so the search box and the category filter fight each other (`MenuClient.tsx:42`). Add an "All" category.
- **M2. Network failure leaves checkout stuck.** `fetch` in `CheckoutDrawer.tsx:71` has no try/catch. On a flaky cafe Wi-Fi the button stays on "Sending..." forever and a retry is impossible. Wrap, show an error, and add an idempotency key so retry cannot double-order.
- **M3. Cart is lost on refresh and the language choice is not remembered.** Persist both locally.
- **M4. Admin cannot manage anything real.** No create or edit of items, categories, variants, payment methods, QR codes or tables, branch hours, or users. The only write actions are availability toggles and price. `createMenuItem` exists in the store but has no route or UI. The "multi-tenant" claim has no tenant onboarding.
- **M5. Admin links are hard-coded to `demo-cafe`** (`app/admin/layout.tsx:22`, `app/order/[token]/page.tsx:19`), and the admin always uses the "first branch". Wrong for any second venue.
- **M6. One init promise is cached even when it fails.** `initializeAndSeed` stores the promise on `globalThis` (`store.ts:38`). If the first call rejects (DB briefly down at startup), every later call returns the same rejection until the process restarts.
- **M7. DDL runs on first request, not as migrations. (Fixed in Phase 4.)** `src/db/init.ts` hand-writes SQL that can drift from `schema.ts`, with `ALTER TABLE ADD COLUMN` wrapped in "ignore already exists". Use drizzle-kit migrations run in the deploy step. `drizzle/` is in `.gitignore`, so migrations could not be committed either.
- **M8. PGlite in production is unsafe.** Fine for dev and tests. Multiple Node workers on one data directory can corrupt it. Require `DATABASE_URL` when `NODE_ENV=production`.
- **M9. Dashboard "today" uses the server's timezone** (`setHours(0,0,0,0)`) and loads every row of today's orders only to sum them. Use SQL `sum()` and a per-branch timezone. Revenue also counts cancelled orders.
- **M10. Two nearly identical order endpoints.** `/api/orders` (JSON) duplicates `/api/public/orders` with a stricter schema (phone required) and no receipt support. Bank or wallet orders always fail there with "Receipt image required", and cash orders bypass the receipt flow and the QR-token lookup. Delete it.
- **M11. Client-sent `unitCents` is validated and then ignored.** Harmless, but confusing. Remove from the schema.

## 6. Low and polish

- CSP allows `'unsafe-inline'` scripts. Use nonces (Next supports them in the proxy). `proxy.ts` and `next.config.mjs` both set headers. Pick one.
- Images are hot-linked from Unsplash and the CSP only allows that one host. Real restaurants need uploads. Store in object storage and serve via `next/image` or a CDN.
- Currency is `ILS`, amounts are cents of ILS, phone and copy are Palestine-specific. Fine if intended, but the "universal" pitch needs per-branch currency formatting, locale, and a configurable payment-method list (it is a table already).
- Accessibility: category `<select>` plus tab buttons duplicate each other; drawers have `aria-modal` but no focus trap or Escape handling; cart `+/-` buttons have no labels. `alt` always uses the English name.
- Audit log has no read UI. Receipt size limit is checked against `file.size` before reading, but the multipart body itself is parsed first with no body-size cap, so a 500 MB upload still gets buffered.
- Integration test covers one happy path. Add: concurrency, receipt upload, wrong tenant for every admin route, role checks, unavailable item, closed branch, transition rules.
- `SYSTEM_MAP.md` says `.uploads` is gitignored, that unauthenticated calls get 401, and lists the thermal ticket as "ESC/POS" (it is browser `window.print()` with CSS, not ESC/POS). Update when fixed.

## 7. What is good (keep)

- Tenant scoping on every admin query, tested for orders.
- SHA-256-hashed QR and tracking tokens, 192-bit random tracking token.
- Magic-byte receipt check, size cap, random file names.
- Bcrypt cost 12, httpOnly + sameSite + secure cookie, login rate limit.
- Server-side price calculation (client prices are not trusted). This is the most important correctness property and it is right.
- RTL/Arabic support in the menu, mobile-first CSS, lazy-loaded checkout drawer.
- Clean, small, typed code. Easy to change.

## 8. Implementation plan

Order matters: phase 1 makes it safe, phase 2 makes the core loop actually work, phase 3 makes it feel modern.

### Phase 1: Safe to deploy (about 2-3 days) - DONE 2026-10-15 (see status below)
1. Seed demo data only outside production. Fail startup if `AUTH_SECRET` missing in production. Require `DATABASE_URL` in production. (C2, C6, M8)
2. `requireSession()` returns 401 in API routes. Add `requireRole()` and apply to price and settings changes. (C4, C7)
3. Real QR tokens: generate at creation, store encrypted or show once, fix `getQrTokenForBranch`. (C5)
4. Fix Dockerfile (no `public/` copy or create it, writable data dir) and `.gitignore` (`.uploads`, keep `drizzle/`). (C3)
5. Rate limiter: trust only the proxy's real client IP, add cleanup, move to Postgres or Redis for multi-instance. (H9)

#### Phase 1 status

Verified in a scratch copy: typecheck, lint, integration test and production build pass. Checked on a running production build: demo credentials rejected, first owner created from `ADMIN_EMAIL`/`ADMIN_PASSWORD`, unauthenticated admin calls return 401 (was 500), bad id returns 404, bad JSON returns 400, login page no longer shows demo credentials, old public demo QR token returns 404, spoofed `X-Forwarded-For` no longer bypasses the login limit (429 after 8 tries), missing `DATABASE_URL` in production makes `/api/health` return 503.

| Item | Result |
|---|---|
| C2 demo seed | Demo owner only outside production. Production needs `ADMIN_EMAIL` + `ADMIN_PASSWORD` (12+ chars). Login page prefill is dev-only. |
| C6 AUTH_SECRET | Production throws unless 32+ chars and not the placeholder. Read lazily so `next build` still works. |
| M8 database | Production requires `DATABASE_URL`; `ALLOW_PGLITE=true` is the explicit escape hatch. |
| C4 / C7 API auth | New `requireApiSession()`: 401 signed out, 403 wrong role. Staff can no longer change prices. Pages redirect to `/login`. Ids must be UUIDs, bad JSON gives 400. |
| C5 QR tokens | Token = HMAC of the QR row id (`QR_TOKEN_SECRET` or `AUTH_SECRET`). The hard-coded demo token is gone and no longer resolves. Existing rows are re-keyed on first read. Changing the secret invalidates printed QR codes. |
| C3 Docker | Removed the missing-`public/` failure (added `public/.gitkeep`), non-root user can write `UPLOAD_DIR=/data/uploads` (volume), `.uploads` and `.pgdata` ignored by git and Docker, `drizzle/` no longer ignored. **Docker is not installed here, so the image build was not run.** |
| H9 rate limit | Client IP counted from the right of `X-Forwarded-For` using `TRUST_PROXY_HOPS` (default 1). Expired buckets are swept. Also fixed M6 (a failed init is no longer cached). |

Not done in Phase 1: the rate limiter is still in-memory, so it is per-instance (fine for one instance, not for several). The role check is only on item price; staff-vs-owner rules for future settings routes come with Phase 3. Receipts are still on local disk until Phase 2.

### Phase 2: The loop works (about 1 week) - DONE 2026-10-15 except object storage (see status below)
1. Object storage for receipts plus `GET /api/admin/orders/[id]/receipt` (auth, tenant-checked, short-lived signed URL). Receipt viewer in the order card, with payment actions **Verify** and **Reject**. (C1, H5, H10)
2. Transactional order creation with a per-branch counter, idempotency key, rollback of stored receipt on failure. (H1, H2, M2)
3. Server-side names, IDs not names for variants and add-ons, reject unknown IDs. (H3, H4)
4. Status transition rules, cancellation reason, `ready` shown to the customer with table or name. Localize the order page. (H5, H7)
5. Persist tracking token and cart locally, redirect to the order page after submit. (H6, M3)
6. Real tests: concurrency, tenant isolation on every admin route, upload validation, transitions. Run lint, typecheck and tests in CI.

#### Phase 2 status

Verified in a scratch copy: typecheck and lint clean, integration test (now about 40 assertions) passes, production build passes, and a scripted HTTP run against the production server passed (upload, replay, receipt access control, status rules, tracking). In the browser pane I checked: cart survives reload, checkout redirects to the tracker, tracker in English and Arabic (RTL) on a 375px phone, admin receipt preview, and the reject-payment flow. The design detector reports no findings on the changed UI files.

| Item | Result |
|---|---|
| C1 receipt viewer | `GET /api/admin/orders/[id]/receipt`: login required, tenant-checked, storage key validated against path tricks, never sent to the browser. Admin card has a **View receipt** toggle, **Payment verified** and **Reject payment** (reason shown to the customer). Receipt storage is behind `lib/receipts.ts` (3 functions). |
| H1 / H2 | Order number comes from an atomic per-branch counter (`branches.next_order_number`), order and audit row are written in one transaction, the stored file is deleted if the order fails or is a replay. 8 parallel orders got 8 distinct numbers. |
| M2 retries | Checkout sends an idempotency key. A retry returns the same order and the same tracking link (tracking tokens are now derived from the order id, like QR tokens). Network failure shows an error instead of hanging. |
| H3 / H4 | Ticket names come from the database (English, plus Arabic shown beside it). Variants and add-ons are sent as ids; unknown or foreign ids return 400. Client prices and names are no longer accepted. |
| H5 | Orders only move forward, cancel allowed until completed, terminal states are final, two staff racing get a 409. Accepting a transfer order requires **Payment verified**. Payment can be reviewed once. Every change is audited. |
| H10 | A receipt image or transfer reference already used on another live order of the branch returns 409 (rejected orders do not block a corrected resubmit). |
| H6 / M3 | Cart, language and the active order link are kept in `localStorage`; after submit the customer lands on `/order/[token]`; the menu shows "You have an order in progress". |
| H7 | Tracker has 5 steps (Received, Accepted, Preparing, Ready, Done), shows "payment is being checked", says where the order will be brought (table) or under which name to collect it, shows the cancel reason, is English/Arabic, and links back to its own branch menu. |
| M1 / M10 | Menu has an "All" category so search covers everything. The duplicate `/api/orders` endpoint was deleted. |

Not done in Phase 2:
- **Object storage.** Receipts are still on local disk (`UPLOAD_DIR`). Needs your choice of provider and credentials; swap the three functions in `lib/receipts.ts`.
- Retry after changing the cart: the idempotency key lives for the whole checkout drawer, so if a request reached the server but the answer was lost and the customer then edits the cart before retrying, they get the first order back.
- A receipt file can be orphaned if the server crashes between saving the file and writing the order. A cleanup job for files with no order is a Phase 3 chore.
- Staff can still reject or verify any payment; there is no owner-only approval.

### Phase 3: Modern experience (about 1-2 weeks)
1. Server-Sent Events for the admin queue and the customer tracker. Replace both polls. Sound-enable button, wake-lock, visual "new order" banner. (H8)
2. Admin CRUD: items, categories, variants, add-ons, payment methods, tables and QR sheet (printable PDF), open hours, staff users.
3. Image upload and resizing. Per-branch currency, locale, timezone.
4. Table-bound QR with "call waiter" and re-order. Optional web push when the order is ready.
5. Drizzle migrations in CI/CD, Sentry, health and uptime checks, daily backups (already in the README, not wired).

### Decision for you
- **Payment verification:** manual by staff (current), or integrate a PSP so verification is automatic? Manual does not scale past one busy counter.
- **Realtime transport:** SSE (my recommendation: simple, no extra service) or a managed realtime service.
- **Hosting:** the README suggests Render or a VPS. Either works. If object storage is S3-compatible, you are not locked in.

## 9. Phase 3 and 4 status (2026-10-15)

### Phase 3: first slice done

Verified in a scratch copy: typecheck and lint clean, integration test passes (menu editing, tables, closing the shop, payment methods, change events), production build passes, and two scripted HTTP runs against the production server passed (event streams, access control, uploads, item CRUD). In the browser pane: an order placed from outside appeared in an already-open admin Orders page in under half a second with the tab title showing "(3) New orders"; the item editor opened, a 3000x2000 photo was shrunk to 900x600 in the browser, uploaded, saved, and showed on the customer menu. The design detector reports no findings on the changed UI files.

| Item | Result |
|---|---|
| H8 live updates | Server-Sent Events replace polling: `/api/admin/events` (login required) and `/api/public/orders/[token]/events` (only that order). Events carry no data; pages refetch. A slow poll (30 s admin, 20 s customer) covers a dropped connection. **Turn on alerts** button unlocks sound and keeps the screen awake (browsers require a tap); tab title shows the number of new orders; the customer's phone vibrates when the order is ready. |
| Open/closed | Settings page switch. Closed shops still show the menu (a QR scan no longer gives a 404) but ordering is off in the menu and on the server. Any staff member can toggle it. |
| M4 admin menu | Items: create, edit, delete, sold-out toggle, photo upload (shrunk in the browser to 900 px), sizes/variants and add-ons edited in place so ids stay stable. Categories: add, rename, hide. Owner and manager only, except sold-out. |
| Payment methods | Add, edit, deactivate, one preselected default. Venue name, address, phone and currency code editable. |
| Tables and QR | Create Table 1..N or one named table; each gets its own QR code (orders arrive with the table filled in); disable a table; printable A4 QR sheet. QR images are login-protected and never cached. |
| M5 | Admin navigation highlights the current page and links to the real branch menu, no longer `demo-cafe`. |

### Phase 4: staff accounts, migrations, multi-instance

Verified in a scratch copy: `npx tsc --noEmit`, `npx eslint .`, `npm run test:integration` (now also the migration upgrade test) and `npx next build` all pass. Against a real PostgreSQL 17: `npm run test:postgres` passes (the whole integration suite on Postgres, LISTEN/NOTIFY, rate limiter), and a scripted HTTP run against two production servers sharing one database passed (staff API and page, disabled and reset sessions, a live update crossing from one instance to the other, the login limit holding across both). In the browser pane the staff page showed the people list and the Disable button worked. **Not verified:** the Docker image (no Docker on this machine), so the new `migrator` stage and `CMD` are untested.

| Item | Result |
|---|---|
| Staff accounts | Owner-only page `/admin/staff` and API `GET/POST /api/admin/staff`, `PATCH /api/admin/staff/[id]`: list, create (owner, manager or staff), change role, disable and enable, reset password (12 to 72 characters, bcrypt). Every query is scoped to the owner's business; another business's user answers 404. An owner cannot disable themselves or change their own role. Each change is written to the audit log (never the password). No delete: disable keeps order history intact. |
| Sessions follow the account | `getSession` now checks the database on every request (one query, shared per request). Disabling a user, resetting their password or changing their role takes effect on the next click, not after the 8 hour token expires. The token carries a short fingerprint of the password hash for this; an owner who changes their own password gets a fresh cookie and stays signed in. Tokens issued before this release carry no fingerprint, so everyone signs in once after deploy. |
| M7 migrations | `src/db/init.ts` no longer holds DDL. `drizzle/0000_baseline.sql` is the schema made by `drizzle-kit generate`, rewritten to be idempotent so a database built by the old code is upgraded in place (missing columns added, existing tables, indexes and foreign keys kept, order counter re-synced). `0001_rate_limits.sql` is plain drizzle-kit output. `scripts/migrate.mjs` (`npm run db:migrate`) applies them under an advisory lock, so several instances may start together; it runs as `prestart` and in the Docker `CMD`. PGlite migrates itself on first use; on Postgres the app only checks and refuses to start on a database that is behind. `scripts/migrations-test.ts` builds a database from a frozen copy of the old DDL, adds data, migrates twice and compares it with a fresh one. `drizzle-kit generate` reports no drift. |
| Several instances | With `DATABASE_URL` set, `publish()` sends Postgres `NOTIFY` and each instance `LISTEN`s and feeds its own open streams (`lib/events.ts`). Rate limits are one atomic upsert into `rate_limits` (`lib/rate-limit.ts`, now `await`ed), using the database clock. With PGlite both stay in process. A broken counter lets the request through rather than blocking login and orders. |

Things to know:
- A NOTIFY sent while an instance's LISTEN connection is reconnecting is lost; the 30 s and 20 s polling in the pages covers it.
- A database made by the old code keeps its old auto-named constraints, and `orders.public_token_hash` stays as it was there (nullable if it was added by an old `ALTER`). Nothing reads either.
- Leftover rows in `rate_limits` are deleted by the instances once a minute.

**Not done** (still open, in rough priority order):
1. Object storage for receipts and photos (local disk behind `lib/receipts.ts`; needs your provider choice).
2. Sentry or error reporting, uptime check, scheduled database backups.
3. Per-branch timezone and locale; the dashboard "today" total still uses the server clock and counts cancelled orders (M9).
4. Cleanup job for receipt files with no order; CSP nonces instead of `'unsafe-inline'`; focus trap and Escape in the customer drawers.
5. Web push when an order is ready, "call waiter", per-QR order cooldown against spam.
6. Several branches per business: the admin screens always use the first branch.
7. Staff: self-service password change for managers and staff, a login lockout per account (the rate limit is per IP), and permanent deletion of an account if ever needed.

## 10. Tech stack decision (2026-10-17): keep Next.js, do not rewrite

Measured on the production build, warm server: the customer menu page sends 189 KB of gzipped JavaScript and CSS in 10 files, the HTML is 5 KB gzipped, and the server answers in about 65 ms (the first request after start takes about 4 s while the database starts). Production build takes about 15 s. Typecheck, lint, the integration test and the build pass. These numbers do not show a framework that is too heavy or unreliable for this product.

Reasons to keep it:
- The problems that mattered were in the application, not the framework: receipts the admin could not see, 500 errors instead of 401, a hard-coded demo QR token, polling instead of push, local-disk files, no tests. All of these were fixed in the current code and would have to be fixed again in any other stack.
- A rewrite to SvelteKit, or to Hono or Fastify with a small client, would cost roughly two to three weeks, throw away the behaviour verified in the integration test and HTTP runs, and save an estimated 100 KB or so of client JavaScript (an estimate, not measured). It would not change payment verification, storage, monitoring or the look of the screens.
- Server-Sent Events, file uploads and a long-running Node process all work in Next.js when self-hosted, which is the plan. They would not on a serverless host; do not deploy this on one.

Real costs of Next.js here, accepted: the first compile in development is slow (about 20 s on this machine), the standalone Docker image is larger than a Hono one, and the framework changes quickly, so versions are pinned in package.json.

Revisit the decision only if a measurement on a real phone over 4G shows the menu is too slow after the first-screen fixes, or if the team grows a strong preference for another stack. The next real gains are in the customer screen: show the menu first instead of a marketing banner, load real photos, and test on a phone.

**Confirmed 2026-10-17: stay on Next.js.** The owner reviewed the option of moving to SvelteKit (smaller client bundle, smaller server surface) and chose to stay. Rules that keep the known risks small:
- Keep Next.js and React on patched versions. Run `npm audit --omit=dev` before every release and after every dependency change. Two critical Next.js problems were fixed in 2025: CVE-2025-29927 (middleware auth bypass) and CVE-2025-55182 (React Server Components remote code execution, fixed in Next 16.0.7 and later).
- Never rely on `proxy.ts` (middleware) for access control. Every admin page and API route checks the session itself, as it does today.
- Do not add Server Actions or other server-function endpoints. Use plain route handlers with Zod validation, as today.
- Keep the domain logic in `src/server` and `lib`, free of Next imports, so a later move to another framework stays possible.

Design direction for the customer screens (not built yet): cheerful ice-cream-shop feel in pink, blue and cream with rounded shapes (similar in spirit to Baskin-Robbins, not its exact colors or logo); Arabic and English are separate, with a language switch and a right-to-left layout in Arabic, never both languages in one line; the menu comes first, with no marketing banner; reference screenshots are inspiration only and must not be copied. Open product question: whether a table shares one open bill (people add items and pay together or separately) or each checkout stays its own order, as it is today.

## 11. Customer screens redesign (2026-10-17)

Built from the owner's brief: the owner's palette (light and dark), Thmanyah Sans from `custom-font/`, and the structure of the four reference screens, without copying them. Direction contract: `.impeccable/surfaces/components-menu-menuapp-tsx.md`. Design system record: `DESIGN.md` and `.impeccable/design.json`. Product record: `PRODUCT.md`.

What changed:
- Menu first (no banner), search, item rows with photo, name, description, price and add button, a bottom dock with a cart bar above scrollable category pills, a native dialog sheet for sizes and extras, a cart screen, a checkout screen and a rebuilt order status page.
- Arabic and English are separate with a language switch (cookie `fd_lang`, first visit follows the browser). The whole screen changes language and direction; Arabic uses Arabic-Indic digits; prices show "شيكل" in Arabic and "₪" in English.
- Checkout shows the venue's wallet or bank number with a copy button, the amount to send, transfer phone and reference, and a receipt photo that is shrunk in the browser before upload. Payment options are pay at table or counter, PalPay wallet, Jawwal Pay and bank transfer. There is no card payment.
- Venue data now has optional Arabic fields (venue name, item description, variant and add-on names, payment method name and instructions), added by migration `0002_arabic_fields`, editable in the admin menu editor and settings page. Blank Arabic text falls back to English.
- The build no longer needs Google Fonts (fonts are served from this app), and the build warnings about tracing the upload folder are gone.
- About 45 unused customer style rules were removed from `app/globals.css`.

Reviewed by the Impeccable finish reviewer (disposition fix); the material fixes were applied: dark-mode status contrast, "Served to" wording and table names, stronger control borders, 44 px tap targets in the cart, one price-and-add line per row, "View cart" wording, 404 message on the status page, empty states, phone digit normalisation, safe-area and theme colors.

Not done, on purpose or still open:
- No tax, estimated time or "call waiter" (they do not exist in the product). If wanted, they are product decisions first.
- The open bill per table is still undecided; each checkout is its own order.
- Restored carts silently drop items that sold out in the meantime; "Clear" has no confirmation. Both were reviewer suggestions not yet built.
- The admin screens keep the older look and the old English-only copy.
- Dev database: after pulling these changes run `npm run db:reset` once so the demo seed has the Arabic data and the new payment methods.

## 12. Staff screens redesign (2026-10-17)

The admin screens now share the customer design system (palette, Thmanyah Sans, dark set) and have an English and Arabic switch (cookie `fd_lang`, same as the customer screens). Staff text lives in `lib/i18n-admin.ts`, the Arabic set typed against the English one. Styles: `app/admin.css` (`.fda-*`, inside the `.fd` scope). Design record: `DESIGN.md` section "Staff screens".

What changed:
- Shell: a rail at the start edge on desktop; on phones a top bar with a scrolling tab bar. Language switch and sign out are in the shell (there was no sign-out before).
- Orders: filter chips with counts (open, check payment, new, in the kitchen, ready, closed), oldest waiting first, ticket cards with a table chip, one filled action per ticket, receipt preview, two-step reject and cancel with a reason, time only for today's orders.
- Dashboard: a compact strip (orders today, sales today without cancelled orders, open orders), recent orders, venue QR.
- Menu editor, tables and QR sheet, settings and payment methods, staff and login restyled with Arabic fields. Stopping orders, disabling a person and deleting an item ask for confirmation.
- Orders now store the Arabic names of the payment method and the chosen options (migration `0003_order_label_ar`), so an Arabic ticket has no English in the middle of a line. Older orders still show English.
- Order and table numbers never use thousands separators ("#1001").

Reviewed by the Impeccable finish reviewer (disposition fix); the material fixes were applied. Not reviewed or captured: the QR print sheet, the reject-reason form and empty states in the browser, and an Arabic phone view of the menu editor.

Still open: the landing page at `/` keeps the older look (`app/globals.css`); no estimated time, tax or call-waiter (they do not exist); the open bill per table is undecided.

## 13. Customer app, version 2

Rebuilt from the owner's second brief. The customer app is now one single-page shell with a splash video, a concave carousel of the most ordered items on Home, a floating curved category wheel as the only navigation, borderless item cards, and a view-transition item view. Light mode only, Thmanyah Sans everywhere, Latin digits, Arabic by default, money as "29 شيكل" or "ILS 29". Search, favourites, tips, tax, call waiter and card wording are gone. The old landing page and `globals.css` were deleted: `/` is the menu.

Table links changed from `/q/fd_<43 characters>` to `/t/k7q3-xm9d-4trb`: 12 characters of Crockford base32 (60 bits) derived from the QR row id with the server secret, grouped in fours, tolerant of case and spaces when typed. Printed codes from before this change stop working and must be reprinted (the tables page regenerates them). Item names are capped at 24 characters so a name always fits on one line.

Checks run: type check, lint, integration tests (including the new code format, typed-code lookup, default branch and popular items) and browser checks on a phone-sized view in Arabic and English. Not verified: a production build in this pass, iOS Safari view transitions, and the splash on slow networks.

Finish review of the customer app (disposition fix), material fixes applied: the order API now takes the table only from a resolved QR code and rejects a code that does not resolve; the built-in QR key is allowed only for local runs; the intro video no longer waits on a missed "ended" event and is paused under reduced motion; the wheel and carousel restart cleanly after a language switch and when returning from the cart; the page behind an open item is inert and focus returns to the opener; the item photo is decoded before the transition; wheel names keep readable contrast; item names scroll inside their box rather than spill; the language button's accessible name is its visible text. Left as is: arrow-key control of the wheel and carousel, and the back-button history when leaving the order screen.

## 14. Customer app, version 3

Second round from the owner. Rebuilt: the view-transition item view (now a measured grow-from-card animation), the carousel (a real concave curve), the category wheel (endless, springy, with a one-time swipe hint), the order bar and wording ("order", not "cart"), checkout (no table card or field, validated name and 05 mobile number, server-side too), payment order, quantity controls on every item, extras as "Add" buttons, a cookie session for the open order and the followed order, horizontal reading-direction gradients, grain and light on coloured controls, and the intro hand-off (the intro was removed from the page before its fade finished; it also locked scrolling on staff pages, now fixed). Staff screens lost their borders, shadows and pill shapes. Fonts became three WOFF2 subsets, brand files get long cache headers, the dev server keeps its compiler cache on disk and hides its corner badge.

Lighthouse (mobile, local production build): accessibility 100, SEO 100, best practices 82. The best-practices loss is plain HTTP on localhost, which HTTPS removes. Performance (about 70 to 78) and the compression and minify findings are not trustworthy on this machine: an antivirus proxy injects its own blocking script into every page and strips compression, and those requests dominate the report. It has to be measured again on the real HTTPS deployment. Direct measurement of our own requests shows every file served within about 300 ms locally.

## 15. Customer app, version 4

Third round. The lag when switching categories came from the wheel: it changed the page only after its spring had settled (about a second); it now acts the moment the destination is known (measured: 7 ms from tap to the new page). Heavier causes removed: an animated moving grain and an animated custom property on every coloured control (constant repaints), scale pulses, per-frame style reads in the wheel, and long staggered entrances. The carousel was rebuilt (see DESIGN.md). The order status card gained a collapsible detail view, which needed the order API to return items, payment and note for the token's own order. `npm run local` was added to run the production build locally; `npm run dev` is slower by nature (compile on demand, development React).

## 16. Demo menu

The seed now creates five sections (Coffee, Waffles and Crepes, Ice Cream, Desserts, Juices) with 21 items, Arabic and English text, sizes and extras where they fit. The home carousel's fill takes one item from each section in turn. The development database and uploaded receipts were wiped and rebuilt from the migrations; a copy of the old ones was kept outside the project.
