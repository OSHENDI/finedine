import { EventEmitter } from "node:events";
import type postgres from "postgres";
import { getDbState } from "@/src/db/client";

// Live updates. Every connected browser has a Server-Sent Events stream on a channel
// ("business:<id>", "order:<id>"); publish(channel) tells those streams to send "change".
//
// With embedded PGlite there is one process, so publish() emits on an in-process bus.
// With Postgres there may be several app instances, and the order might be placed on one
// while the staff screen is connected to another. publish() then sends a NOTIFY, and every
// instance (this one included) LISTENs, re-emitting what it hears on its own in-process bus.
const globalForBus = globalThis as unknown as { fineDineBus?: EventEmitter; fineDineListener?: Promise<boolean> };
const bus = (globalForBus.fineDineBus ??= new EventEmitter().setMaxListeners(0));
const NOTIFY_CHANNEL = "finedine_events";

// LIVE_UPDATES=memory keeps updates inside this process: right for a single instance (the free Render
// plan), and it leaves no connection open, so a serverless database (Neon) can scale to zero when idle.
// Leave it unset when several app instances share one database.
function postgresClient() {
  if (process.env.LIVE_UPDATES === "memory") return null;
  const state = getDbState();
  return state.mode === "postgres" ? (state.client as ReturnType<typeof postgres>) : null;
}

// One LISTEN connection per process (postgres.js reconnects and re-listens by itself). A change
// sent while it reconnects is lost; the pages poll slowly as a backup. Resolves false if LISTEN failed.
function ensureListener(client: ReturnType<typeof postgres>) {
  globalForBus.fineDineListener ??= client
    .listen(NOTIFY_CHANNEL, (channel) => bus.emit(channel))
    .then(() => true)
    .catch((error) => {
      console.error("[finedine] could not LISTEN for live updates", error);
      globalForBus.fineDineListener = undefined;
      return false;
    });
  return globalForBus.fineDineListener;
}

export function publish(channel: string) {
  const client = postgresClient();
  if (!client) {
    bus.emit(channel);
    return;
  }
  // Fire and forget: a failed notification must never fail the order that caused it.
  void ensureListener(client)
    .then(async (listening) => {
      await client`SELECT pg_notify(${NOTIFY_CHANNEL}, ${channel})`;
      if (!listening) bus.emit(channel);
    })
    .catch((error) => {
      console.error("[finedine] could not publish a live update", error);
      bus.emit(channel);
    });
}

// Server-Sent Events stream that sends a "change" event whenever the channel is published.
// Clients refetch their data on "change"; the event itself carries no data, so nothing private can leak.
export function eventStream(request: Request, channel: string) {
  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      const onChange = () => send("event: change\ndata: {}\n\n");
      const client = postgresClient();
      if (client) void ensureListener(client);
      // The comment line keeps proxies and phones from closing an idle connection.
      const heartbeat = setInterval(() => send(": ping\n\n"), 25_000);
      bus.on(channel, onChange);
      cleanup = () => {
        clearInterval(heartbeat);
        bus.off(channel, onChange);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      request.signal.addEventListener("abort", cleanup);
      send("retry: 3000\n\n: connected\n\n");
    },
    cancel() {
      cleanup();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
