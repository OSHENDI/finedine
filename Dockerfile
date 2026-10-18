FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=true
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Just enough to run scripts/migrate.mjs against Postgres. The Next standalone output only
# contains files the app itself imports, which does not include drizzle's migrator.
FROM node:22-alpine AS migrator
WORKDIR /migrate
COPY package.json /tmp/package.json
RUN npm init -y >/dev/null  && npm install --no-audit --no-fund     drizzle-orm@$(node -p "require('/tmp/package.json').dependencies['drizzle-orm']")     postgres@$(node -p "require('/tmp/package.json').dependencies['postgres']")

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/drizzle ./drizzle
COPY --from=migrator /migrate/node_modules ./migrate/node_modules
COPY --from=builder /app/scripts/migrate.mjs ./migrate/migrate.mjs

# Images are stored in the database; the container needs no volume.
USER nextjs
EXPOSE 3000
ENV PORT=3000
# Apply database migrations (real Postgres only; embedded PGlite migrates itself) and then start.
CMD ["sh", "-c", "if [ -n \"$DATABASE_URL\" ]; then node migrate/migrate.mjs; fi && exec node server.js"]
