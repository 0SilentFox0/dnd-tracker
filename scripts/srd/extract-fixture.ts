#!/usr/bin/env tsx
// pnpm exec tsx --tsconfig tsconfig.scripts.json scripts/srd/extract-fixture.ts [--source <dir>] [--out <dir>] <slug>...
import * as fs from "fs";
import * as path from "path";

import { fetchOpen5e } from "./lib/fetch";
import { FIXTURE_DIR, matchesAny, OPEN5E_FILE_OF } from "./lib/open5e";
import type { Open5eFile } from "./lib/source";

const FULL_FILES = new Set<Open5eFile>(["Document", "WeaponProperty"]);

async function main() {
  const args = process.argv.slice(2);

  const flag = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

  const source = flag("--source") ?? (await fetchOpen5e());

  const out = flag("--out") ?? FIXTURE_DIR;

  const ids = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--source" && args[i - 1] !== "--out");

  fs.mkdirSync(out, { recursive: true });

  for (const file of Object.values(OPEN5E_FILE_OF)) {
    const rows = JSON.parse(fs.readFileSync(path.join(source, `${file}.json`), "utf8")) as Array<{ pk: unknown; fields: Record<string, unknown> }>;

    const kept = FULL_FILES.has(file) ? rows : rows.filter((r) => matchesAny(r, ids));

    fs.writeFileSync(path.join(out, `${file}.json`), `${JSON.stringify(kept, null, 2)}\n`);
    console.info(`${file}: ${kept.length}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
