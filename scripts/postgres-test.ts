// Checks what only a real Postgres can show: LISTEN/NOTIFY live updates, the shared rate limiter,
// and that the whole integration suite passes on Postgres. Needs an empty database:
//   TEST_DATABASE_URL=postgresql://user@localhost:5432/finedine_test npm run test:postgres
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import postgres from "postgres";

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  console.log("postgres test skipped: set TEST_DATABASE_URL to an empty Postgres database");
  process.exit(0);
}
process.env.DATABASE_URL = url;

const run = (script: string) => {
  const result = spawnSync(process.execPath, ["--import", "tsx", script], { stdio: "inherit", env: process.env });
  assert.equal(result.status, 0, `${script} failed`);
};
run("scripts/migrate.mjs");

const { publish, eventStream } = await import("../lib/events");
const { rateLimit } = await import("../lib/rate-limit");
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- rate limiter: shared counter, atomic under concurrency, window resets
const key = `test:${Date.now()}`;
const sequence = [];
for (let i = 0; i < 5; i++) sequence.push((await rateLimit(key, 3, 60_000)).ok);
assert.deepEqual(sequence, [true, true, true, false, false], "fourth request in the window is refused");
const burstKey = `burst:${Date.now()}`;
const burst = await Promise.all(Array.from({ length: 40 }, () => rateLimit(burstKey, 5, 60_000)));
assert.equal(burst.filter((result) => result.ok).length, 5, "concurrent requests never exceed the limit");
const shortKey = `short:${Date.now()}`;
assert.ok((await rateLimit(shortKey, 1, 1000)).ok);
assert.ok(!(await rateLimit(shortKey, 1, 1000)).ok);
await sleep(1300);
assert.ok((await rateLimit(shortKey, 1, 1000)).ok, "a new window starts after the old one ends");

// --- live updates: through this process's publish() and from another connection (another instance)
const abort = new AbortController();
const response = eventStream(new Request("http://localhost/events", { signal: abort.signal }), "test:channel");
const reader = response.body!.getReader();
const decoder = new TextDecoder();
let received = "";
const pump = (async () => {
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    received += decoder.decode(value);
  }
})();
const waitFor = async (text: string, label: string) => {
  for (let waited = 0; !received.includes(text) && waited < 5000; waited += 25) await sleep(25);
  assert.ok(received.includes(text), label);
};
await waitFor(": connected", "stream opens");
await sleep(300); // let LISTEN settle
publish("test:channel");
await waitFor("event: change", "publish() reaches a stream on the same instance");

received = "";
const other = postgres(url, { max: 1, prepare: false });
await other`SELECT pg_notify('finedine_events', 'test:channel')`;
await waitFor("event: change", "a NOTIFY from another connection reaches the stream");
received = "";
await other`SELECT pg_notify('finedine_events', 'other:channel')`;
await sleep(300);
assert.ok(!received.includes("event: change"), "other channels are not delivered");
await other.end();
abort.abort();
await pump.catch(() => {});

// --- the full integration suite on Postgres
const suite = spawnSync(process.execPath, ["--import", "tsx", "scripts/integration.ts"], { stdio: "inherit", env: { ...process.env, TEST_DATABASE_URL: url } });
assert.equal(suite.status, 0, "integration suite fails on Postgres");

console.log("postgres ok");
process.exit(0);
