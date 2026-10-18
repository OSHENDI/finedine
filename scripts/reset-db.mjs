import { rmSync } from "node:fs";
import { join } from "node:path";

rmSync(join(process.cwd(), ".pgdata"), { recursive: true, force: true });

console.log("Local PGlite database reset. It will be recreated and seeded on next app/test run.");
