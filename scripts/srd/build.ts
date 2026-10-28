#!/usr/bin/env tsx
// pnpm srd:build [--source <dir>]
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { magicVariants } from "./convert/magic-items";
import { buildSrdData } from "./lib/build-data";
import { coverage4f5b } from "./lib/coverage-4f5b";
import { writeSrdData } from "./lib/data-files";
import { fetchOpen5e, verifySourceDir } from "./lib/fetch";
import { loadOpen5e } from "./lib/open5e";
import { SRD_DATA_DIR } from "./lib/source";

async function main() {
  const args = process.argv.slice(2);

  const source = args.includes("--source") ? verifySourceDir(args[args.indexOf("--source") + 1]) : await fetchOpen5e();

  const open5e = loadOpen5e(source);

  const data = buildSrdData(open5e);

  const manifest = writeSrdData(data, SRD_DATA_DIR, new Date().toISOString().slice(0, 10));

  writeFileSync(join(SRD_DATA_DIR, "coverage-4f5b.json"), `${JSON.stringify(coverage4f5b(data), null, 2)}\n`);

  console.info(`SRD 5.2 → ${SRD_DATA_DIR}`);

  for (const [kind, count] of Object.entries(manifest.counts)) console.info(`  ${kind}: ${count}`);

  const mechanizedSpells = data.spells.filter((s) => s.spellEffects.length > 0).length;

  const notes = data.classes.flatMap((c) => [...c.features, ...c.subclasses.flatMap((s) => s.features)]).flatMap((f) => f.abilities);

  console.info(`  spells with effects: ${mechanizedSpells}/${data.spells.length}`);
  console.info(`  composed names verified: ${magicVariants(open5e, data.artifacts.filter((a) => a.rarity === "common")).length}`);
  console.info(`  class abilities with mechanics: ${notes.filter((a) => a.effects.some((e) => e.kind !== "note")).length}/${notes.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
