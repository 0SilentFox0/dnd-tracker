import * as path from "path";

import { SRD_DATA_DIR } from "../../srd/lib/source";
import { readIconsFile, writeIconsFile } from "../../templates/lib/icons-file";

export type IconKind = "spells" | "units" | "artifacts" | "features" | "races" | "classes" | "subclasses" | "backgrounds" | "feats";

export type IconsFile = Record<IconKind, Record<string, string>>;

export const ICONS_FILE = path.join(SRD_DATA_DIR, "icons.json");

const KINDS: IconKind[] = ["spells", "units", "artifacts", "features", "races", "classes", "subclasses", "backgrounds", "feats"];

export function readIcons(file = ICONS_FILE): IconsFile {
  const stored = readIconsFile(file);

  return Object.fromEntries(KINDS.map((k) => [k, stored[k] ?? {}])) as IconsFile;
}

export const writeIcons = (icons: IconsFile, file = ICONS_FILE): void => writeIconsFile(file, Object.fromEntries(KINDS.map((k) => [k, icons[k]])));
