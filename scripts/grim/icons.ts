import * as fs from "fs";
import * as path from "path";

import { GRIM_DATA_DIR, GRIM_ROW_KINDS, type GrimData, type GrimRowKind } from "./data";

export type GrimIcons = Record<GrimRowKind, Record<string, string>>;

export const GRIM_ICONS_FILE = path.join(GRIM_DATA_DIR, "icons.json");

export const GRIM_ICON_COLUMN: Record<GrimRowKind, "icon" | "avatar"> = { feats: "icon", careers: "icon", races: "icon", spells: "icon", units: "avatar", artifacts: "icon" };

const fileIn = (dir: string) => path.join(dir, "icons.json");

export function readGrimIcons(dir: string = GRIM_DATA_DIR): GrimIcons {
  const file = fileIn(dir);

  const stored: Partial<GrimIcons> = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};

  return Object.fromEntries(GRIM_ROW_KINDS.map((kind) => [kind, stored[kind] ?? {}])) as GrimIcons;
}

export function writeGrimIcons(icons: GrimIcons, dir: string = GRIM_DATA_DIR): void {
  const sorted = Object.fromEntries(GRIM_ROW_KINDS.map((kind) => [kind, Object.fromEntries(Object.keys(icons[kind]).sort().map((name) => [name, icons[kind][name]]))]));

  fs.writeFileSync(fileIn(dir), `${JSON.stringify(sorted, null, 2)}\n`);
}

export function withGrimIcons(data: GrimData, icons: GrimIcons): GrimData {
  const next = { ...data };

  for (const kind of GRIM_ROW_KINDS) {
    const column = GRIM_ICON_COLUMN[kind];

    next[kind] = data[kind].map((row) => {
      const url = icons[kind][String(row.name)];

      return url ? { ...row, [column]: url } : row;
    });
  }

  return next;
}

export function grimIconIssues(data: GrimData, icons: GrimIcons): string[] {
  return GRIM_ROW_KINDS.flatMap((kind) => {
    const names = new Set(data[kind].map((row) => String(row.name)));

    return Object.entries(icons[kind]).flatMap(([name, url]) => [...(names.has(name) ? [] : [`icons: ${kind} "${name}" is not in the catalog`]), ...(url.startsWith("https://") ? [] : [`icons: ${kind} "${name}" url must be https`])]);
  });
}

export function grimIconGaps(data: GrimData, icons: GrimIcons): string[] {
  return GRIM_ROW_KINDS.flatMap((kind) => data[kind].filter((row) => !icons[kind][String(row.name)]).map((row) => `icons: ${kind} "${row.name}" has no icon`));
}
