import * as fs from "fs";
import * as path from "path";

import { TEMPLATES_DIR } from "./pack";

export type IconsFile = Record<string, Record<string, string>>;

type Slugged = { slug?: unknown };

const fileOf = (key: string, dir: string) => path.join(dir, key, "icons.json");

export const readIconsFile = (file: string): IconsFile => (fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as IconsFile) : {});

export function writeIconsFile(file: string, icons: IconsFile): void {
  const sorted = Object.fromEntries(Object.entries(icons).map(([kind, urls]) => [kind, Object.fromEntries(Object.keys(urls).sort().map((key) => [key, urls[key]]))]));

  fs.writeFileSync(file, `${JSON.stringify(sorted, null, 2)}\n`);
}

export const readIcons = (key: string, dir = TEMPLATES_DIR): IconsFile => readIconsFile(fileOf(key, dir));

export const writeIcons = (key: string, icons: IconsFile, dir = TEMPLATES_DIR): void => writeIconsFile(fileOf(key, dir), icons);

/** Fills `column` from the slug-keyed urls; a row that already carries an explicit value keeps it. */
export function withIcons<T extends { slug: string }>(rows: T[], icons: Record<string, string> | undefined, column = "icon"): T[] {
  if (!icons) return rows;

  return rows.map((row) => {
    const url = icons[row.slug];

    return url && !(row as Record<string, unknown>)[column] ? { ...row, [column]: url } : row;
  });
}

const slugsOf = (rows: Slugged[]) => new Set(rows.flatMap((r) => (typeof r.slug === "string" ? [r.slug] : [])));

/** A url for a slug that has no row, or a non-https url. Kinds that are not row kinds of the data (features, subclasses) are skipped. */
export function iconIssues(data: Record<string, Slugged[]>, icons: IconsFile): string[] {
  return Object.entries(icons).flatMap(([kind, urls]) => {
    const rows = data[kind];

    if (!rows) return [];

    const slugs = slugsOf(rows);

    return Object.entries(urls).flatMap(([key, url]) => [...(slugs.has(key.split("/")[0]) ? [] : [`icons: ${kind} "${key}" is not in the catalog`]), ...(url.startsWith("https://") ? [] : [`icons: ${kind} "${key}" url must be https`])]);
  });
}

export const iconGaps = (data: Record<string, Slugged[]>, icons: IconsFile): string[] =>
  Object.entries(data).flatMap(([kind, rows]) => [...slugsOf(rows)].filter((slug) => !icons[kind]?.[slug]).map((slug) => `icons: ${kind} "${slug}" has no icon`));
