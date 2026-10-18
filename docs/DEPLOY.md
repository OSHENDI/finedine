# Putting FineDine online (free) and updating it with git push

GitHub holds the code, your own computer builds the site, Render runs it, Neon stores the data.
Both Render and Neon have a free plan. You run one command (`npm run release`); a few minutes later the live site is new.

## What it looks like when it is live

- One address, for example `https://finedine-xxxx.onrender.com`.
  - `/` is the customer menu. A table QR code opens `/t/<code>` on the same address.
  - `/login` is the staff sign-in. After it: orders, menu, tables, settings, staff.
- Customers on their phones scan, order and pay; their order screen updates by itself.
- Staff see new orders appear live and confirm payments.
- Menu changes, prices and photos are made in the staff screens and show up at once. No deploy.
- Code changes go live a few minutes after `npm run release`.

## Where things live (images, video, fonts, files)

| What | Where it is kept | How it reaches the live site |
| --- | --- | --- |
| Logo, intro video, intro poster, favicon | `public/` and `app/icon.png` in the repository | Part of every deploy. Served at `/logo.png`, `/intro.mp4`, `/icon.png`. To change one, replace the file and push. |
| Fonts | `app/fonts/` (3 WOFF2 files) | Bundled by the build, served from `/_next/static/media/`, cached for a year. |
| Menu photos and payment receipts | The Neon database (table `uploads`) | Uploaded in the staff Menu screen (photos) or by customers (receipts). Served at `/api/media/<id>` (photos, public) and in the staff Orders screen (receipts, private). Not in git, so they survive every deploy. |
| Demo menu photos | Unsplash addresses in the demo data | Fetched and resized by the server on first view. For a real venue, upload your own photos in the Menu screen. |
| Originals (intro project, source video, original fonts) | `design-source/` on your computer, git-ignored | Never deployed. |

Rule of thumb: files that are part of the app go in `public/` and are pushed with the code; anything
a person uploads while the site is running goes through the staff screens into the database. Do not
rely on writing files to the server's disk: the free host wipes it on every deploy.

Very large videos (more than a few MB) should not go in the repository; host them on a video service
or a CDN and link to them.

## One-time setup (about 20 minutes)

1. **Database (Neon).** Create a free account at neon.tech and a project in the Frankfurt region.
   Open "Connect", switch OFF "Connection pooling", and copy the connection string. It looks like
   `postgresql://user:password@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`.
2. **Publish the site.** Commit your work, then run `npm run release`. It checks the code, builds the site
   on your computer and pushes the result to a branch called `release` on GitHub. Render needs that
   branch, so do this before step 3. The first run takes 3 to 5 minutes.
3. **App (Render).** Create a free account at render.com and connect your GitHub. Choose New,
   Blueprint, select the repository. Render reads `render.yaml`. It asks for three values:
   - `DATABASE_URL`: the Neon string from step 1.
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD`: the first owner account (password of 12+ characters).
   `AUTH_SECRET` and `QR_TOKEN_SECRET` are generated for you. Press Apply.
4. Wait for the first deploy (2 to 4 minutes). Your address is shown at the top of the service page.
   Open `/api/health` (it should say `"ok":true`), then `/`, then `/login`.
5. **Keep it awake.** A free Render service sleeps after 15 minutes without visits and takes about a
   minute to wake. For a demo, make a free account at cron-job.org and add a job that opens
   `https://<your-address>/api/health` every 10 minutes. That address does not touch the database, so
   the database is still free to sleep between real visits (a first visit after a quiet period waits an
   extra second or two for it to wake).

## Updating

- Code: commit, then `npm run release`. It runs the checks (types, lint, tests), builds, and publishes to
  `release`; Render deploys `release` by itself (watch the Render Events tab). A failing check stops the
  release, so a bad change never goes live. `git push` alone only saves the source on GitHub.
- Menu, prices, photos, tables and staff: change them in the staff screens.
- Database changes (files in `drizzle/`) are applied automatically each time the app starts.

## Why the site is built on your computer

Building the site needs far more than 512 MB (about 1.4 GB measured on a Windows computer); the free
Render instance has 512 MB, so a build there would be killed. Your computer builds it, and Render only
installs and runs the result. No CI service or paid plan is needed.

## Settings reference

| Name | What it does |
| --- | --- |
| `DATABASE_URL` | Neon connection string (direct, not pooled). Required. |
| `AUTH_SECRET` | Signs sign-in sessions. Generated. Changing it signs everyone out. |
| `QR_TOKEN_SECRET` | Makes the table codes. Generated. Changing it invalidates printed QR codes. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | First owner, created only when the database is empty. |
| `LIVE_UPDATES` | `memory` for one instance (set in `render.yaml`). Leave unset when running several copies. |
| `APP_URL` | Only for a custom domain (QR codes use it). Otherwise Render's address is used. |
| `TRUST_PROXY_HOPS` | Proxies in front of the app. 1 on Render. |
| `ORDER_RATE_LIMIT` | Orders per minute per address. 120 in `render.yaml`. |
| `DB_POOL_MAX` | Database connections per instance (default 10). |

## Limits to know

- One instance only. 50 to 100 customers at once is comfortable for it.
- The free Neon database holds 0.5 to 1 GB (thousands of shrunk photos and receipts). When it fills,
  delete old receipts or move to a paid plan.
- The first visit after a long idle takes about a minute (use the keep-awake job above).
- The first start with an empty database creates a demo cafe (menu, tables, payment methods). Edit
  or delete them in the staff screens.

## If something goes wrong

- **Render says the branch `release` does not exist:** run `npm run release` once.
- **`npm run release` stops with an error:** it names the failed check; fix it and run again.
- **Page shows an error right after "live":** wait 2 minutes; the first start prepares the database.
- **Login fails after a typo in the email or password:** change the value in Render under Environment.
  If the first start already finished, open Neon's SQL Editor, run `TRUNCATE businesses CASCADE;`, then
  restart the service in Render. This wipes the demo data.
- **Photos missing:** upload them again in the staff Menu screen.
