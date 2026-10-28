import { Prisma } from "@prisma/client";

import { cascadeRelationsOf, tableKey } from "./content-dependencies";

import "server-only";
import { prisma } from "@/lib/db";
import { BUNDLE_TABLES, delegateOf } from "@/lib/server/templates/bundle";
import { collectKeysAndStrings } from "@/lib/server/templates/remap-ids";
import type { Actor } from "@/lib/utils/api/actor";

type Row = Record<string, unknown>;
type Delegate = { findMany: (args: unknown) => Promise<Row[]> };

const CHARACTER_SELECT = {
  id: true, race: true, subrace: true, class: true, classes: true, backgroundId: true, backgroundChoices: true,
  knownSpells: true, feats: true, raceChoices: true, backgroundFeatPicks: true,
} as const;

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const tableName = (model: string) => Prisma.dmmf.datamodel.models.find(entry => entry.name === model)?.dbName ?? model;

const REGEX_CHUNK = 500;

/** Rows of the table whose text mentions one of the ids; the exact match is applied by contentDependencies. */
async function mentioning(table: string, ids: readonly string[], campaignScope: Prisma.Sql): Promise<string[]> {
  const found = new Set<string>();

  for (let i = 0; i < ids.length; i += REGEX_CHUNK) {
    const pattern = ids.slice(i, i + REGEX_CHUNK).map(escapeRegex).join("|");

    const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT t.id FROM ${Prisma.raw(`"${table}"`)} t ${campaignScope} AND t::text ~ ${pattern} ORDER BY t.id`);

    for (const row of rows) found.add(row.id);
  }

  return [...found].sort();
}

/** Only the rows a content preview can show: rows mentioning the target/incoming ids and FK-referencing rows. */
export async function contentPreviewState(actor: Actor, kind: string, id: string | undefined, body: unknown) {
  const campaignId = actor.campaignId;

  const own = await Promise.all(BUNDLE_TABLES.map(async table => [table.key, (await delegateOf(prisma, table).findMany({ where: { campaignId }, select: { id: true } }) as Row[]).map(row => String(row.id))] as const));

  const idsByTable = Object.fromEntries(own);

  const incoming = collectKeysAndStrings(body);

  const ids = new Set<string>(id ? [id] : idsByTable[tableKey(kind)] ?? []);

  for (const list of Object.values(idsByTable)) for (const rowId of list) if (incoming.has(rowId)) ids.add(rowId);

  const list = [...ids];

  const tables: Record<string, Row[]> = {};

  const ownKey = id ? undefined : tableKey(kind);

  for (const table of BUNDLE_TABLES) {
    const delegate = prisma[table.delegate] as unknown as Delegate;

    if (table.key === ownKey) {
      tables[table.key] = await delegate.findMany({ where: { campaignId }, orderBy: { id: "asc" } });
      continue;
    }

    const found = await mentioning(tableName(table.model), list, Prisma.sql`WHERE t."campaignId" = ${campaignId}`);

    tables[table.key] = found.length ? await delegate.findMany({ where: { id: { in: found }, campaignId }, orderBy: { id: "asc" } }) : [];
  }

  const characterIds = await mentioning("characters", list, Prisma.sql`WHERE t."campaignId" = ${campaignId}`);

  const inventoryIds = await mentioning("character_inventories", list, Prisma.sql`JOIN characters c ON c.id = t."characterId" WHERE c."campaignId" = ${campaignId}`);

  const skillIds = await mentioning("character_skills", list, Prisma.sql`JOIN characters c ON c.id = t."characterId" WHERE c."campaignId" = ${campaignId}`);

  return {
    tables,
    characters: characterIds.length ? await prisma.character.findMany({ where: { id: { in: characterIds }, campaignId }, orderBy: { id: "asc" }, select: CHARACTER_SELECT }) : [],
    inventory: inventoryIds.length ? await prisma.characterInventory.findMany({ where: { id: { in: inventoryIds } }, orderBy: { id: "asc" } }) : [],
    skills: skillIds.length ? await prisma.characterSkills.findMany({ where: { id: { in: skillIds } }, orderBy: { id: "asc" } }) : [],
  };
}

/** Rows that FK-reference the given ids of `kind`, grouped by bundle table, for delete previews. */
async function referencing(campaignId: string, kind: string, ids: readonly string[]): Promise<Record<string, Row[]>> {
  const model = BUNDLE_TABLES.find(table => table.key === tableKey(kind))?.model;

  const tables: Record<string, Row[]> = {};

  if (!model || !ids.length) return tables;

  for (const relation of cascadeRelationsOf(model)) {
    const table = BUNDLE_TABLES.find(entry => entry.key === relation.table)!;

    const rows = await (prisma[table.delegate] as unknown as Delegate).findMany({ where: { campaignId, [relation.column]: { in: [...ids] } }, orderBy: { id: "asc" } });

    tables[relation.table] = [...new Map([...tables[relation.table] ?? [], ...rows].map(row => [String(row.id), row])).values()];
  }

  return tables;
}

/** Targeted rows for operationPreview; null when the operation has no projection. */
export async function contentOperationState(actor: Actor, operation: string, input: Row) {
  const campaignId = actor.campaignId;

  const body = (input.body ?? {}) as Row;

  const db = prisma as unknown as Record<string, Delegate>;

  const find = (delegate: string, where: Row, select?: Row) => db[delegate].findMany({ where: { campaignId, ...where }, orderBy: { id: "asc" }, ...(select && { select }) });

  switch (operation) {
    case "skills.duplicate": return { tables: { skills: await find("skill", { id: input.skillId }) } };
    case "spells.remove-from-group": return { tables: { spells: await find("spell", { id: input.spellId }) } };
    case "spell-groups.remove-all-spells": return { tables: { spellGroups: await find("spellGroup", { id: input.groupId }), spells: await find("spell", { groupId: input.groupId }) } };
    case "spells.delete-by-level": {
      const spells = await find("spell", { level: body.level });

      return { tables: { spells, ...await referencing(campaignId, "spells", spells.map(row => String(row.id))) } };
    }
    case "tracks.reorder": return { tables: { tracks: await find("campaignTrack", {}, { id: true, title: true, sortOrder: true }) } };
    case "rules.update": return { campaign: await prisma.campaign.findUnique({ where: { id: campaignId }, select: { rules: true } }) };
    case "skill-trees.save": return { tables: { skillTrees: await find("skillTree", { OR: [...(input.treeId ? [{ id: String(input.treeId) }] : []), ...(body.race ? [{ race: body.race }] : [])] }) } };
    default: return null;
  }
}
