import * as fs from "fs";
import * as path from "path";

import { assertSeedTarget } from "../../seed/seed-library-lib";
import { delegateFor, labelSelect, rowLabel } from "./kind-delegate";
import { readManifest, TEMPLATES_DIR } from "./pack";
import { makeTemplateStore } from "./store";

import { prisma } from "@/lib/db";
import { writeSlug } from "@/lib/server/content/import/slug";
import { withCampaignRuntimeWrite } from "@/lib/server/content/write";
import type { PackKind } from "@/lib/utils/templates/manifest";
import type { ImportKind } from "@/types/content-import";

export type SlugsFile = Record<string, Record<string, string>>;

export interface SlugPlan { kind: PackKind; id: string; slug: string }

export interface BackfillResult { plan: SlugPlan[]; unmapped: { kind: string; id: string; label: string }[]; written: number }

/** Which unslugged rows get which slug; rows without a map entry and slug collisions are reported, not guessed. */
export function planSlugBackfill(rowsByKind: Record<string, { id: string; slug: string | null; label: string }[]>, map: SlugsFile): { plan: SlugPlan[]; unmapped: BackfillResult["unmapped"]; collisions: string[] } {
  const plan: SlugPlan[] = [];

  const unmapped: BackfillResult["unmapped"] = [];

  const collisions: string[] = [];

  for (const [kind, rows] of Object.entries(rowsByKind)) {
    const taken = new Set(rows.flatMap((row) => (row.slug ? [row.slug] : [])));

    for (const row of rows) {
      if (row.slug) continue;

      const slug = map[kind]?.[row.id];

      if (!slug) unmapped.push({ kind, id: row.id, label: row.label });
      else if (taken.has(slug)) collisions.push(`${kind} ${row.id}: slug "${slug}" is already taken`);
      else {
        taken.add(slug);
        plan.push({ kind: kind as PackKind, id: row.id, slug });
      }
    }
  }

  return { plan, unmapped, collisions };
}

export const slugsFilePath = (key: string): string => path.join(process.cwd(), "scripts/templates", key, "slugs.json");

export async function backfillSlugs(key: string, opts: { apply?: boolean; allowRemote?: boolean; dir?: string; slugsFile?: string } = {}): Promise<BackfillResult> {
  assertSeedTarget(process.env.DATABASE_URL, opts.allowRemote ?? false);

  const manifest = readManifest(key, opts.dir ?? TEMPLATES_DIR);

  const template = await makeTemplateStore(manifest).findTemplate();

  if (!template) throw new Error(`No official template for "${key}" in the database`);

  const file = opts.slugsFile ?? slugsFilePath(key);

  if (!fs.existsSync(file)) throw new Error(`No slug map: ${file}`);

  const map = JSON.parse(fs.readFileSync(file, "utf8")) as SlugsFile;

  const rowsByKind: Record<string, { id: string; slug: string | null; label: string }[]> = {};

  for (const kind of manifest.kinds) {
    const rows = await delegateFor(prisma, kind).delegate.findMany({ where: { campaignId: template.id }, select: labelSelect(kind), orderBy: [{ createdAt: "asc" }, { id: "asc" }] });

    rowsByKind[kind] = rows.map((row) => ({ id: row.id, slug: typeof row.slug === "string" ? row.slug : null, label: rowLabel(row, row.id) }));
  }

  const { plan, unmapped, collisions } = planSlugBackfill(rowsByKind, map);

  if (unmapped.length > 0 || collisions.length > 0) {
    const lines = [...unmapped.map((row) => `${row.kind} ${row.id} "${row.label}": not in the slug map`), ...collisions];

    throw new Error(`Slug backfill stopped, nothing written:\n  ${lines.join("\n  ")}`);
  }

  for (const row of plan) console.info(`${opts.apply ? "" : "would write "}${row.kind} ${row.id} -> ${row.slug}`);

  if (opts.apply) await withCampaignRuntimeWrite(template.id, async () => { for (const row of plan) await writeSlug(template.id, row.kind as ImportKind, row.id, row.slug); });

  return { plan, unmapped, written: opts.apply ? plan.length : 0 };
}
