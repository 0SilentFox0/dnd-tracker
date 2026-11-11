import * as fs from "fs";

import { addSlugs } from "./add-slugs";
import { type Pack, packPath, type PackRow, readManifest, readPack, TEMPLATES_DIR } from "./pack";

import type { PackKind } from "@/lib/utils/templates/manifest";

export interface SourceAdapter {
  build(ctx: { dir: string; args: string[] }): Promise<void>;
}

/** Copies the selected rows (and their icon urls) of the source packs with `origin`; a slug clash or a missing source row throws. */
export function applyIncludes(pack: Pack, sources: Record<string, Pack>): Pack {
  const rows: Pack["rows"] = Object.fromEntries(Object.entries(pack.rows).map(([kind, list]) => [kind, [...(list ?? [])]]));

  const icons = Object.fromEntries(Object.entries(pack.icons).map(([kind, urls]) => [kind, { ...urls }]));

  for (const { from, kinds } of pack.manifest.include ?? []) {
    const source = Object.hasOwn(sources, from) ? sources[from] : undefined;

    if (!source) throw new Error(`include: source pack "${from}" is not loaded`);

    for (const [kind, selection] of Object.entries(kinds) as [PackKind, readonly string[] | "all"][]) {
      if (!pack.manifest.kinds.includes(kind)) throw new Error(`include from "${from}": kind "${kind}" is not in the manifest kinds`);

      const available = source.rows[kind] ?? [];

      const chosen: PackRow[] = selection === "all" ? available : selection.map((slug) => available.find((row) => row.slug === slug) ?? fail(`include from "${from}": ${kind} "${slug}" is not in the source`));

      const target = (rows[kind] ??= []);

      for (const row of chosen) {
        const clash = target.find((existing) => existing.slug === row.slug);

        if (clash) throw new Error(`include from "${from}": ${kind} slug "${row.slug}" collides with "${String(clash.name ?? clash.slug)}"`);

        target.push({ ...row, origin: { template: from, slug: row.slug } });

        const url = source.icons[kind]?.[row.slug];

        if (url) (icons[kind] ??= {})[row.slug] = url;
      }
    }
  }

  return { ...pack, rows, icons };
}

const fail = (message: string): never => {
  throw new Error(message);
};

const writeJson = (file: string, value: unknown) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

const adapterFile = (key: string) => `${__dirname}/../${key}/build.ts`;

/** Runs the source adapter (when the pack has one), applies includes, fills slugs, refreshes counts and writes the files. */
export async function buildPack(key: string, opts: { dir?: string; args?: string[]; initSlugs?: boolean } = {}): Promise<Pack> {
  const dir = opts.dir ?? TEMPLATES_DIR;

  if (fs.existsSync(adapterFile(key))) await ((await import(`../${key}/build.ts`)) as { default: SourceAdapter }).default.build({ dir, args: opts.args ?? [] });

  const current = readPack(key, dir, { lenient: true });

  const sources = Object.fromEntries((current.manifest.include ?? []).map(({ from }) => [from, readPack(from, dir)]));

  const built = applyIncludes(current, sources);

  const slugged = opts.initSlugs ? { ...built, rows: Object.fromEntries(Object.entries(built.rows).map(([kind, rows]) => [kind, addSlugs((rows ?? []) as Array<PackRow & { name: string }>)])) as Pack["rows"] } : built;

  const counts = Object.fromEntries(slugged.manifest.kinds.map((kind) => [kind, slugged.rows[kind]?.length ?? 0]));

  for (const kind of slugged.manifest.kinds) if (JSON.stringify(slugged.rows[kind]) !== JSON.stringify(current.rows[kind]) || !fs.existsSync(packPath(key, `${kind}.json`, dir))) writeJson(packPath(key, `${kind}.json`, dir), slugged.rows[kind]);

  if (JSON.stringify(slugged.icons) !== JSON.stringify(current.icons)) writeJson(packPath(key, "icons.json", dir), slugged.icons);

  if (JSON.stringify(counts) !== JSON.stringify(current.manifest.counts)) writeJson(packPath(key, "manifest.json", dir), { ...readManifest(key, dir), counts });

  return { ...slugged, manifest: { ...slugged.manifest, counts } };
}
