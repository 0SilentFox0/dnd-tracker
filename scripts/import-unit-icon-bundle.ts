#!/usr/bin/env tsx
/**
 * Розпаковує бандл портретів юнітів ({ data: { unitKey: dataUrl } }) у assets/unit-icons/<unitKey>.webp.
 *
 *   pnpm import-unit-icons <bundle.json>
 */
import * as fs from "fs";
import * as path from "path";

import { decodeImageDataUrl } from "./wiki-icons-lib";

const DIR = path.join(process.cwd(), "assets", "unit-icons");

function main() {
  const bundlePath = process.argv[2];

  if (!bundlePath) {
    console.error("Використання: import-unit-icons <bundle.json>");
    process.exit(1);
  }

  const bundle = JSON.parse(fs.readFileSync(bundlePath, "utf8")) as { data: Record<string, string> };

  fs.mkdirSync(DIR, { recursive: true });

  for (const [key, dataUrl] of Object.entries(bundle.data)) {
    fs.writeFileSync(path.join(DIR, `${key}.webp`), decodeImageDataUrl(dataUrl));
  }

  console.log(`✓ ${Object.keys(bundle.data).length} іконок юнітів у assets/unit-icons`);
}

main();
