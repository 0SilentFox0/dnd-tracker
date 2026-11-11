import * as fs from "fs";
import * as path from "path";

import { TemplateManifestSchema } from "@/lib/schemas/template-manifest";
import type { Ruleset } from "@/lib/utils/rules/schema";
import type { PackKind, TemplateManifest } from "@/lib/utils/templates/manifest";

export const TEMPLATES_DIR = process.env.TEMPLATES_DIR ?? path.join(process.cwd(), "data/templates");

export const packPath = (key: string, file: string, dir = TEMPLATES_DIR): string => path.join(dir, key, file);

export function listPackKeys(dir = TEMPLATES_DIR): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(packPath(entry.name, "manifest.json", dir)))
    .map((entry) => entry.name)
    .sort();
}

export function readManifest(key: string, dir = TEMPLATES_DIR): TemplateManifest {
  const manifest = TemplateManifestSchema.parse(JSON.parse(fs.readFileSync(packPath(key, "manifest.json", dir), "utf8")));

  if (manifest.key !== key) throw new Error(`Manifest key "${manifest.key}" does not match the folder name "${key}"`);

  return manifest;
}

export type IconsFile = Record<string, Record<string, string>>;

export type PackRow = { slug: string; name?: string; origin?: { template: string; slug: string } } & Record<string, unknown>;

export interface Pack {
  manifest: TemplateManifest;
  /** a patch until 4.3 gives every pack a full rules.json */
  rules?: Ruleset;
  rows: Partial<Record<PackKind, PackRow[]>>;
  extras: Record<string, unknown>;
  icons: IconsFile;
}

const readJsonIf = <T>(key: string, file: string, dir: string): T | undefined => {
  const target = packPath(key, file, dir);

  return fs.existsSync(target) ? (JSON.parse(fs.readFileSync(target, "utf8")) as T) : undefined;
};

/** `lenient` (build only): a kind file that does not exist yet reads as an empty kind. */
export function readPack(key: string, dir = TEMPLATES_DIR, opts: { lenient?: boolean } = {}): Pack {
  const manifest = readManifest(key, dir);

  const rows = Object.fromEntries(
    manifest.kinds.map((kind) => {
      const found = readJsonIf<PackRow[]>(key, `${kind}.json`, dir);

      if (!found && !opts.lenient) throw new Error(`Pack "${key}" lists kind "${kind}" but ${kind}.json is missing`);

      return [kind, found ?? []];
    }),
  );

  const extras = Object.fromEntries((manifest.extras ?? []).map((name) => [name, readJsonIf<unknown>(key, `${name}.json`, dir)]));

  return { manifest, rules: readJsonIf<Ruleset>(key, manifest.rules.file, dir), rows, extras, icons: readJsonIf<IconsFile>(key, "icons.json", dir) ?? {} };
}
