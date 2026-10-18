# Putting FineDine online (free) and updating it with git push

The setup is GitHub, Render (the app) and Neon (the database). Both services have a free plan, and
every push to the `main` branch rebuilds and redeploys the app by itself.

Why not Netlify: the app is one long-running server (live order updates, sign-in sessions, image
uploads). Netlify runs short serverless functions, which cannot hold that. Render runs the app as a
normal server.

## One-time setup (about 15 minutes)

1. **Database (Neon).** Create a free account at neon.tech and a project (pick a region near your
   customers; Frankfurt for the Middle East). On the project page open "Connect", switch OFF
   "Connection pooling", and copy the connection string. It looks like
   `postgresql://user:password@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`.
2. **GitHub.** Push this folder to a repository (private is fine).
3. **App (Render).** Create a free account at render.com and connect your GitHub. Choose
   New, Blueprint, select the repository. Render reads `render.yaml`. It asks for three values:
   - `DATABASE_URL`: the Neon string from step 1.
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD`: the first owner account (password of 12+ characters).
   `AUTH_SECRET` and `QR_TOKEN_SECRET` are generated for you. Press Apply.
4. Wait for the first build (3 to 6 minutes). Your address is shown at the top of the service
   page: `https://finedine-xxxx.onrender.com`. The customer menu is at `/`, the staff sign-in at `/login`.
5. **Keep it awake.** A free Render service sleeps after 15 minutes without visits and takes about a
   minute to wake. For a demo, make a free account at cron-job.org and add a job that opens
   `https://finedine-xxxx.onrender.com/api/health` every 10 minutes. This also keeps the database awake.

## Updating

- Code: `git push` to `main`. Render rebuilds and swaps the new version in (about 3 to 5 minutes);
  database changes in `drizzle/` are applied automatically at start.
- Menu, prices, photos, tables and staff: change them in the staff screens. Photos and receipts are
  stored in the database, so they stay across deploys and restarts.

## Settings reference

| Name | What it does |
| --- | --- |
| `DATABASE_URL` | Neon connection string (direct, not pooled). Required. |
| `AUTH_SECRET` | Signs sign-in sessions. Generated. Changing it signs everyone out. |
| `QR_TOKEN_SECRET` | Makes the table codes. Generated. Changing it invalidates printed QR codes. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | First owner, created only when the database is empty. |
| `APP_URL` | Only for a custom domain (QR codes use it). Otherwise Render's address is used. |
| `TRUST_PROXY_HOPS` | Proxies in front of the app. 1 on Render. |
| `ORDER_RATE_LIMIT` | Orders per minute per address. 120 in `render.yaml`. |

## Limits to know

- One instance only. Live updates are shared through the database, but the free plan runs a single
  instance anyway. 50 to 100 customers at once is comfortable for it.
- The free Neon database holds 0.5 GB (thousands of shrunk photos and receipts). When it fills,
  delete old receipts or move to a paid plan.
- The first visit after a long idle takes about a minute (use the keep-awake job above).
- The first start with an empty database creates a demo cafe (menu, tables, payment methods).
  Edit or delete them in the staff screens.
