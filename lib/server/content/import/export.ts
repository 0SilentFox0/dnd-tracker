import "server-only";
import { prisma } from "@/lib/db";
import { assertCan } from "@/lib/server/content/access";
import { loadNames } from "@/lib/server/content/import/names";
import { artifactAbilities, artifactSetAbilities, raceAbilities, skillAbilities, unitAbilities } from "@/lib/utils/abilities/read";
import type { Actor } from "@/lib/utils/api/actor";
import { NEED } from "@/lib/utils/api/need";
import { isWeaponSlot, weaponStatsFromRow } from "@/lib/utils/artifacts/weapon-stats";
import { IMPORT_SPECS } from "@/lib/utils/content/import/fields";
import { refKindsOf } from "@/lib/utils/content/import/kinds";
import { recordToCells } from "@/lib/utils/content/import/mapping";
import { toCsv } from "@/lib/utils/content/import/table";
import type { IdName } from "@/types/common";
import type { ImportKind, ImportRecord } from "@/types/content-import";

export type ExportDeps = {
  loadRecords(campaignId: string, kind: ImportKind): Promise<ImportRecord[]>;
  loadNames(campaignId: string, kind: ImportKind): Promise<IdName[]>;
};

const query = (campaignId: string) => ({ where: { campaignId }, orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }] });

const asRecords = (rows: object[]) => rows as ImportRecord[];

export const EXPORT_LOADERS: Record<ImportKind, (campaignId: string) => Promise<ImportRecord[]>> = {
  units: async (c) => asRecords((await prisma.unit.findMany(query(c))).map((r) => ({ ...r, abilities: unitAbilities(r) }))),
  spells: async (c) => asRecords(await prisma.spell.findMany(query(c))),
  skills: async (c) => asRecords((await prisma.skill.findMany(query(c))).map((r) => ({ ...r, abilities: skillAbilities(r) }))),
  "main-skills": async (c) => asRecords(await prisma.mainSkill.findMany(query(c))),
  "spell-groups": async (c) => asRecords(await prisma.spellGroup.findMany(query(c))),
  races: async (c) => asRecords((await prisma.race.findMany(query(c))).map((r) => ({ ...r, abilities: raceAbilities(r) }))),
  classes: async (c) => asRecords(await prisma.gameClass.findMany(query(c))),
  artifacts: async (c) =>
    asRecords((await prisma.artifact.findMany(query(c))).map((r) => ({ ...r, abilities: artifactAbilities(r), weapon: isWeaponSlot(r.slot) ? weaponStatsFromRow(r) : undefined }))),
  "artifact-sets": async (c) =>
    asRecords(
      (await prisma.artifactSet.findMany({ ...query(c), include: { artifacts: { select: { id: true }, orderBy: { createdAt: "asc" } } } })).map(({ artifacts, ...r }) => ({
        ...r,
        abilities: artifactSetAbilities(r),
        artifactIds: artifacts.map((a) => a.id),
      })),
    ),
};

const DEFAULT_DEPS: ExportDeps = { loadRecords: (c, k) => EXPORT_LOADERS[k](c), loadNames };

export async function exportCsv(actor: Actor, kind: ImportKind, deps: ExportDeps = DEFAULT_DEPS): Promise<string> {
  assertCan(actor, NEED.read("dm"));

  const spec = IMPORT_SPECS[kind];

  const refKinds = refKindsOf(spec);

  const [records, ...refLists] = await Promise.all([deps.loadRecords(actor.campaignId, kind), ...refKinds.map((k) => deps.loadNames(actor.campaignId, k))]);

  const names = new Map(refKinds.map((k, i) => [k, new Map((refLists[i] as IdName[]).map((r) => [r.id, r.name]))]));

  const nameOf = (k: ImportKind, id: string) => names.get(k)?.get(id);

  return toCsv(spec.fields.map((f) => f.label), records.map((r) => recordToCells(spec, r, nameOf)));
}
