#!/usr/bin/env tsx
import * as fs from "fs";
import * as path from "path";

import { decodeImageDataUrl, findMissingKeys, planMissing } from "./wiki-icons-lib";

const ASSETS = path.join(process.cwd(), "assets");

function existingFiles(): Set<string> {
  const set = new Set<string>();

  for (const dir of ["skill-icons", "main-skill-icons"]) {
    const full = path.join(ASSETS, dir);

    if (fs.existsSync(full)) for (const f of fs.readdirSync(full)) set.add(`${dir}/${f}`);
  }

  return set;
}

function main() {
  const bundlePath = process.argv[2];

  if (!bundlePath) {
    console.error("Використання: import-wiki-icons <bundle.json>");
    process.exit(1);
  }

  const bundle = JSON.parse(fs.readFileSync(bundlePath, "utf8")) as { data: Record<string, string> };

  const todo = planMissing(existingFiles());

  if (todo.length === 0) {
    console.log("Усі іконки вже є");

    return;
  }

  const missing = findMissingKeys(todo, bundle.data);

  for (const d of todo) {
    if (!bundle.data[d.file]) continue;

    fs.mkdirSync(path.join(ASSETS, d.dir), { recursive: true });
    fs.writeFileSync(path.join(ASSETS, d.dir, `${d.key}.webp`), decodeImageDataUrl(bundle.data[d.file]));
    console.log(`✓ ${d.dir}/${d.key}.webp`);
  }

  if (missing.length) {
    console.error(`Немає даних у бандлі: ${missing.map((d) => `${d.key} (${d.file})`).join(", ")}`);
    process.exit(1);
  }
}

main();
