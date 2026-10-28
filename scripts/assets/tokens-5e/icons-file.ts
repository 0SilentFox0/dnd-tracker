import * as fs from "fs";
import * as path from "path";

import { SRD_DATA_DIR } from "../../srd/lib/source";
import type { TokenKind } from "./catalog";

export type IconsFile = Record<TokenKind, Record<string, string>>;

export const ICONS_FILE = path.join(SRD_DATA_DIR, "icons.json");

const KINDS: TokenKind[] = ["spells", "units", "artifacts"];

export function readIcons(file = ICONS_FILE): IconsFile {
  const stored: Partial<IconsFile> = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};

  return { spells: stored.spells ?? {}, units: stored.units ?? {}, artifacts: stored.artifacts ?? {} };
}

export function writeIcons(icons: IconsFile, file = ICONS_FILE): void {
  const sorted = Object.fromEntries(KINDS.map((k) => [k, Object.fromEntries(Object.keys(icons[k]).sort().map((slug) => [slug, icons[k][slug]]))]));

  fs.writeFileSync(file, `${JSON.stringify(sorted, null, 2)}\n`);
}
