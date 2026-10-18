# FineDine QR Orders

A focused MVP for restaurants, groceries, coffee shops, ice cream shops, and cake shops.

Customers scan a QR code, browse a fast menu, transfer the total by bank or wallet, then submit the order with transfer details. Staff manage orders from a secure dashboard.

## Local Setup

```bash
npm install
copy .env.example .env
npm run dev
```

Open:

- Customer menu: `http://localhost:3000/m/demo-cafe`
- Admin dashboard: `http://localhost:3000/admin`

Demo login (development only; production needs `ADMIN_EMAIL` and `ADMIN_PASSWORD`, see `.env.example`):

- Email: `owner@finedine.local`
- Password: `FineDine123!`

## MVP Scope

- QR menu page
- Cart
- Payment-before-submit order flow
- Bank/wallet transfer method selection
- Transfer phone and reference requirement
- Admin login
- Dashboard metrics
- Order queue
- Order status changes
- Dynamic QR code route
- Tenant-scoped admin queries
- Zod validation
- Rate limiting
- Security headers
- Real PostgreSQL schema through Drizzle `pg-core`
- Zero-config local PGlite database in `./.pgdata`

## Production Direction

Use managed PostgreSQL for real production. Local development uses PGlite, which gives us PostgreSQL behavior without native Windows database binaries.

Recommended deployment path:

1. Dockerized Next.js app.
2. Managed PostgreSQL.
3. S3-compatible image storage.
4. Sentry for errors.
5. Uptime monitoring.
6. Daily database backups.

For least hassle without Vercel lock-in, use Render with managed PostgreSQL. For lowest long-term cost and more control, use a VPS with Coolify plus managed PostgreSQL, not self-hosted database at first.

## Database

- Schema: `src/db/schema.ts`
- Runtime client: `src/db/client.ts`
- Migrations: `drizzle/` (SQL files made by `npm run db:generate`), applied by `scripts/migrate.mjs`
- Business/order services: `src/server/store.ts`

Local mode:

```bash
npm run db:reset
npm run test:integration
```

Production mode:

```bash
DATABASE_URL="postgresql://user:password@host:5432/finedine"
npm run build
npm start   # runs "npm run db:migrate" first (the Docker image does the same)
```

Changing the schema: edit `src/db/schema.ts`, run `npm run db:generate`, commit the new files in `drizzle/`. Embedded PGlite applies migrations by itself on first use; for a Postgres database run `npm run db:migrate` (the app refuses to start on a database that is behind). Databases made by the old hand-written setup are upgraded in place by the first migration.

Staff accounts: the owner manages them at `/admin/staff`.

Tests: `npm run test:integration` (in-memory PGlite, includes the migration upgrade test). `TEST_DATABASE_URL=postgresql://... npm run test:postgres` runs the same suite plus LISTEN/NOTIFY and rate-limit checks against an empty Postgres database.

Set `DOCKER_BUILD=true` only inside Docker builds to enable Next standalone output.

## CORS Strategy

The MVP is a same-origin app: customer menu, admin dashboard, and API routes are served by the same Next.js application. The browser calls APIs with relative URLs like `/api/orders`, so local testing and production do not need cross-origin CORS headers.

If custom domains are added later, keep API requests same-origin through the same app/domain or add a strict allowlist. Do not use `Access-Control-Allow-Origin: *` for authenticated admin APIs.
