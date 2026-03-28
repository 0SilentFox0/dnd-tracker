/**
 * Overwrites Vercel env vars for the linked project with values from a local file.
 * Usage: node scripts/sync-env-to-vercel.mjs [.env.local] [production|preview|development]
 * Requires: `vercel` CLI, `vercel link` in repo, and `vercel login`.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const envFile = resolve(process.argv[2] ?? ".env.local");
const target = process.argv[3] ?? "production";
const vercelBin = process.env.VERCEL_BIN ?? "vercel";

function runVercel(args) {
  return spawnSync(vercelBin, args, { stdio: "inherit", shell: false });
}

let content;
try {
  content = readFileSync(envFile, "utf8");
} catch {
  console.error(`File not found: ${envFile}`);
  process.exit(1);
}

for (const line of content.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq === -1) continue;
  const key = line.slice(0, eq).trim();
  if (!key) continue;
  let val = line.slice(eq + 1).trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }

  console.log(`→ ${key} → ${target}`);
  const updated = runVercel(["env", "update", key, target, "--value", val, "--yes"]);
  if (updated.status === 0) continue;
  const added = runVercel(["env", "add", key, target, "--value", val, "--yes", "--force"]);
  if (added.status !== 0) {
    process.exit(added.status ?? 1);
  }
}

console.log("Done.");
