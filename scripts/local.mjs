// Run the real production build on this computer: `npm run local`.
// It is what customers get (minified, compressed, no dev overlay, no compile-on-demand), so it is the
// right place to judge speed. It uses the embedded demo database and a secret kept in .local-secret.
// `npm run local -- --fast` skips the build and starts the last one.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const secretFile = ".local-secret";
if (!existsSync(secretFile)) writeFileSync(secretFile, randomBytes(32).toString("hex"));
const env = { ...process.env, ALLOW_PGLITE: "true", AUTH_SECRET: process.env.AUTH_SECRET || readFileSync(secretFile, "utf8").trim() };

const run = (args) => spawnSync("npx", ["next", ...args], { stdio: "inherit", env, shell: true });
if (!process.argv.includes("--fast") || !existsSync(".next/BUILD_ID")) {
  const built = run(["build"]);
  if (built.status !== 0) process.exit(built.status ?? 1);
}
process.exit(run(["start", "-p", process.env.PORT || "3000"]).status ?? 0);
