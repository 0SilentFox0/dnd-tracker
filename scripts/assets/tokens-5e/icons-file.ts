import * as fs from "fs";
import * as path from "path";

import { SRD_DATA_DIR } from "../../srd/lib/source";
export type IconKind = "spells" | "units" | "artifacts" | "features" | "races" | "classes" | "subclasses" | "backgrounds";

export type IconsFile = Record<IconKind, Record<string, string>>;

export const ICONS_FILE = path.join(SRD_DATA_DIR, "icons.json");

const KINDS: IconKind[] = ["spells", "units", "artifacts", "features", "races", "classes", "subclasses", "backgrounds"];

export function readIcons(file = ICONS_FILE): IconsFile {
  const stored: Partial<IconsFile> = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};

  return Object.fromEntries(KINDS.map((k) => [k, stored[k] ?? {}])) as IconsFile;
}

export function writeIcons(icons: IconsFile, file = ICONS_FILE): void {
  const sorted = Object.fromEntries(KINDS.map((k) => [k, Object.fromEntries(Object.keys(icons[k]).sort().map((slug) => [slug, icons[k][slug]]))]));

  fs.writeFileSync(file, `${JSON.stringify(sorted, null, 2)}\n`);
}
