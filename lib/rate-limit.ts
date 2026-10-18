import type postgres from "postgres";
import { getDbState } from "@/src/db/client";

const buckets = new Map<string, { count: number; resetAt: number }>();
let lastSweep = 0;

// Drop expired buckets so the map cannot grow without bound.
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

// Fixed-window counter. With embedded PGlite (one process) it lives in memory. With Postgres the
// counter lives in the rate_limits table, so the limit holds across all app instances and restarts.
export async function rateLimit(key: string, max = 20, windowMs = 60_000) {
  const state = getDbState();
  if (state.mode !== "postgres") return rateLimitInMemory(key, max, windowMs);

  try {
    const client = state.client as ReturnType<typeof postgres>;
    // One atomic statement: start a new window when the old one has ended, otherwise count up.
    // The database clock is used so instances with different clocks agree.
    const [row] = await client<Array<{ count: number }>>`
      INSERT INTO rate_limits AS r (key, count, reset_at)
      VALUES (${key}, 1, now() + make_interval(secs => ${windowMs / 1000}))
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN r.reset_at < now() THEN 1 ELSE r.count + 1 END,
        reset_at = CASE WHEN r.reset_at < now() THEN excluded.reset_at ELSE r.reset_at END
      RETURNING count`;
    void sweepDatabase(client);
    return { ok: row.count <= max, remaining: Math.max(0, max - row.count) };
  } catch (error) {
    // A broken counter must not take login and ordering down with it. The database being down
    // fails those requests anyway.
    console.error("[finedine] rate limit check failed, allowing the request", error);
    return { ok: true, remaining: max };
  }
}

let lastDatabaseSweep = 0;

// Delete finished windows, at most once a minute per process.
async function sweepDatabase(client: ReturnType<typeof postgres>) {
  const now = Date.now();
  if (now - lastDatabaseSweep < 60_000) return;
  lastDatabaseSweep = now;
  try {
    await client`DELETE FROM rate_limits WHERE reset_at < now()`;
  } catch {
    // Try again next minute.
  }
}

function rateLimitInMemory(key: string, max: number, windowMs: number) {
  const now = Date.now();
  sweep(now);
  const current = buckets.get(key);

  if (!current || current.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1 };
  }

  if (current.count >= max) {
    return { ok: false, remaining: 0 };
  }

  current.count += 1;
  return { ok: true, remaining: max - current.count };
}

// Client IP from X-Forwarded-For, counting from the right. Proxies append the
// address they saw, so only the last TRUST_PROXY_HOPS entries are trustworthy;
// anything the client prepended is ignored. Set TRUST_PROXY_HOPS=0 when the app
// is not behind a proxy (all clients then share the "local" bucket).
export function clientIp(request: Request) {
  const hops = Number(process.env.TRUST_PROXY_HOPS ?? 1);
  if (!Number.isInteger(hops) || hops < 1) return "local";
  const parts = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts[parts.length - hops] ?? "local";
}
