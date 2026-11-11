import * as path from "path";

import { iconGaps, iconIssues, readIconsFile, withIcons, writeIconsFile } from "../templates/lib/icons-file";
import { GRIM_DATA_DIR, GRIM_ROW_KINDS, type GrimData, type GrimRowKind } from "./data";

export type GrimIcons = Record<GrimRowKind, Record<string, string>>;

export const GRIM_ICONS_FILE = path.join(GRIM_DATA_DIR, "icons.json");

export const GRIM_ICON_COLUMN: Record<GrimRowKind, "icon" | "avatar"> = { feats: "icon", careers: "icon", races: "icon", spells: "icon", units: "avatar", artifacts: "icon" };

const fileIn = (dir: string) => path.join(dir, "icons.json");

const slugsOf = (data: GrimData, kind: GrimRowKind) => data[kind].map((row) => ({ slug: String(row.slug ?? "") }));

const catalog = (data: GrimData) => Object.fromEntries(GRIM_ROW_KINDS.map((kind) => [kind, slugsOf(data, kind)]));

export const emptyGrimIcons = (): GrimIcons => Object.fromEntries(GRIM_ROW_KINDS.map((kind) => [kind, {}])) as GrimIcons;

export function readGrimIcons(dir: string = GRIM_DATA_DIR): GrimIcons {
  const stored = readIconsFile(fileIn(dir));

  return Object.fromEntries(GRIM_ROW_KINDS.map((kind) => [kind, stored[kind] ?? {}])) as GrimIcons;
}

/** Icons are keyed by row slug. */
export function mergeGrimIcons(old: GrimIcons, uploaded: GrimIcons, data: GrimData): GrimIcons {
  return Object.fromEntries(
    GRIM_ROW_KINDS.map((kind) => {
      const valid = new Set(slugsOf(data, kind).map((r) => r.slug));

      return [kind, Object.fromEntries(Object.entries({ ...old[kind], ...uploaded[kind] }).filter(([slug]) => valid.has(slug)))];
    }),
  ) as GrimIcons;
}

export const writeGrimIcons = (icons: GrimIcons, dir: string = GRIM_DATA_DIR): void => writeIconsFile(fileIn(dir), Object.fromEntries(GRIM_ROW_KINDS.map((kind) => [kind, icons[kind]])));

export function withGrimIcons(data: GrimData, icons: GrimIcons): GrimData {
  const next = { ...data };

  for (const kind of GRIM_ROW_KINDS) next[kind] = withIcons(data[kind] as Array<(typeof data)[typeof kind][number] & { slug: string }>, icons[kind], GRIM_ICON_COLUMN[kind]);

  return next;
}

export const grimIconIssues = (data: GrimData, icons: GrimIcons): string[] => iconIssues(catalog(data), icons);

export const grimIconGaps = (data: GrimData, icons: GrimIcons): string[] => iconGaps(catalog(data), icons);
