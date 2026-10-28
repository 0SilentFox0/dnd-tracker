#!/usr/bin/env tsx
// pnpm srd:build [--source <dir>]
import { buildSrdData } from "./lib/build-data";
import { writeSrdData } from "./lib/data-files";
import { fetchOpen5e, verifySourceDir } from "./lib/fetch";
import { loadOpen5e } from "./lib/open5e";
import { SRD_DATA_DIR } from "./lib/source";

async function main() {
  const args = process.argv.slice(2);

  const source = args.includes("--source") ? verifySourceDir(args[args.indexOf("--source") + 1]) : await fetchOpen5e();

  const data = buildSrdData(loadOpen5e(source));

  const manifest = writeSrdData(data, SRD_DATA_DIR, new Date().toISOString().slice(0, 10));

  console.info(`SRD 5.2 → ${SRD_DATA_DIR}`);

  for (const [kind, count] of Object.entries(manifest.counts)) console.info(`  ${kind}: ${count}`);

  const mechanizedSpells = data.spells.filter((s) => s.spellEffects.length > 0).length;

  const notes = data.classes.flatMap((c) => [...c.features, ...c.subclasses.flatMap((s) => s.features)]).flatMap((f) => f.abilities);

  console.info(`  spells with effects: ${mechanizedSpells}/${data.spells.length}`);
  console.info(`  class abilities with mechanics: ${notes.filter((a) => a.effects.some((e) => e.kind !== "note")).length}/${notes.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
