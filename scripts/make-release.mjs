// Collects what the live server needs into one folder: the built site (.next, without its build cache),
// the production dependency list, the migration runner and its SQL, and the public files.
// `npm run release` (scripts/release.mjs) builds the site on this computer (the free host has too little
// memory to build it), runs this, and publishes the folder to the `release` branch, which the host deploys.
// Usage: node scripts/make-release.mjs <folder>
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const out = process.argv[2];
if (!out) throw new Error("Usage: node scripts/make-release.mjs <output folder>");
if (!existsSync(".next/BUILD_ID")) throw new Error("No build found: run `npm run build` first.");

rmSync(out, { recursive: true, force: true });
mkdirSync(path.join(out, "scripts"), { recursive: true });
cpSync(".next", path.join(out, ".next"), { recursive: true, filter: (source) => !/[.]next[/](cache|dev)([/]|$)/.test(source.split(path.sep).join("/")) });
for (const file of ["package.json", "package-lock.json", "next.config.mjs"]) cpSync(file, path.join(out, file));
cpSync("drizzle", path.join(out, "drizzle"), { recursive: true });
cpSync("public", path.join(out, "public"), { recursive: true });
cpSync("scripts/migrate.mjs", path.join(out, "scripts", "migrate.mjs"));
console.log(`[finedine] release folder ready: ${out}`);
