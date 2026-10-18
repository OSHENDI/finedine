// Builds the site on this computer and publishes it to the `release` branch, which the host deploys.
// The free host has too little memory to build the site, and this needs no CI service.
// Usage: npm run release   (add --skip-checks to skip typecheck, lint and tests)
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const run = (command, options = {}) => {
  const result = spawnSync(command, { shell: true, stdio: "inherit", ...options });
  if (result.status !== 0) throw new Error(`Failed: ${command}`);
};
const read = (command) => spawnSync(command, { shell: true, encoding: "utf8" }).stdout.trim();

if (read("git status --porcelain")) throw new Error("Uncommitted changes: commit them first so the release matches a commit.");
const sha = read("git rev-parse --short HEAD");
const remote = read("git remote get-url origin");
if (!remote) throw new Error("No git remote named origin.");

if (!process.argv.includes("--skip-checks")) {
  run("npm run typecheck");
  run("npm run lint");
  run("npm run test:integration");
}
run("npm run build");

const folder = mkdtempSync(path.join(os.tmpdir(), "finedine-release-"));
const out = path.join(folder, "site");
try {
  run(`node scripts/make-release.mjs "${out}"`);
  const git = (args) => run(`git ${args}`, { cwd: out });
  git("init -q -b release");
  git("config core.autocrlf false");
  git('config user.name "FineDine release"');
  git('config user.email "release@finedine.local"');
  git("add -A");
  git(`commit -q -m "Release ${sha}"`);
  git(`push -q --force "${remote}" release`);
  console.log(`[finedine] published ${sha} to the release branch. The host deploys it by itself.`);
} finally {
  rmSync(folder, { recursive: true, force: true });
}
