# FineDine

QR ordering for restaurants, cafes, bars and ice-cream shops. Customers scan a table code, order
and pay (at the table, or by wallet or bank transfer with a receipt) and follow the order live.
Staff confirm payments, prepare orders and run the menu. Arabic first, English as an equal.

## Run it on your computer

```bash
npm install
copy .env.example .env        # macOS/Linux: cp .env.example .env
npm run dev
```

- Customer menu: http://localhost:3000
- Staff: http://localhost:3000/login (development account `owner@finedine.local` / `FineDine123!`)

With no `DATABASE_URL` the app uses an embedded Postgres in `./.pgdata` and creates a demo cafe on
first start. `npm run db:reset` wipes it. `npm run local` runs the real production build on this
machine, which is the right place to judge speed.

## Checks

```bash
npm run typecheck
npm run lint
npm run test:integration
npm run build
```

## Put it online

Free setup with GitHub auto-deploy (Render plus Neon): see [docs/DEPLOY.md](docs/DEPLOY.md).
Settings are listed in `.env.example`.

## More

- [PRODUCT.md](PRODUCT.md): who it is for and what it will and will not do
- [DESIGN.md](DESIGN.md): the visual system
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): folders, data, request flow
- [docs/history/](docs/history/): earlier review and change log
