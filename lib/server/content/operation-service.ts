import { z } from "zod";

import "server-only";
import { invalidateReference, ReferenceKind, type ReferenceKindValue } from "@/lib/cache/tags";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { getTranslator } from "@/lib/i18n/translator";
import { listTracks } from "@/lib/server/audio/track-store";
import { assertCampaignRefs } from "@/lib/server/campaigns/campaign-refs";
import { readCampaignRules, updateCampaignRules } from "@/lib/server/campaigns/rules";
import { assertCan } from "@/lib/server/content/access";
import { ContentError, parseInput } from "@/lib/server/content/errors";
import { exampleCsv } from "@/lib/server/content/import/example";
import { DEFAULT_DEPS as EXPORT_DEFAULT_DEPS, exportCsv } from "@/lib/server/content/import/export";
import { importContent } from "@/lib/server/content/import/import-content";
import { loadNames } from "@/lib/server/content/import/names";
import { translatedImport, translateImportReport } from "@/lib/server/content/import/translate-report";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { afterContentCommit } from "@/lib/server/content/write-context";
import { listSkillTrees, saveSkillTree } from "@/lib/server/skills/skill-tree-service";
import { exportCampaign } from "@/lib/server/templates/export-campaign";
import { applySource, getSourceDiff } from "@/lib/server/templates/sync/service";
import { abilitiesJson, OwnerKind, readAbilities, skillAbilities } from "@/lib/utils/abilities/read";
import type { Actor } from "@/lib/utils/api/actor";
import { toGameClassData } from "@/lib/utils/characters/classes/row";
import { IMPORT_KINDS } from "@/lib/utils/content/import/kinds";
import { importUnitsIntoCampaign } from "@/lib/utils/units/import-units";

export type ContentOperationId = keyof typeof CONTENT_OPERATIONS;

const id = z.string().min(1).max(200);

const paths: Partial<Record<ContentOperationId, Record<string, z.ZodType>>> = {
  "skill-trees.save": { treeId: id.optional() }, "skills.duplicate": { skillId: id },
  "spells.remove-from-group": { spellId: id }, "spell-groups.remove-all-spells": { groupId: id },
  "abilities.get": { kind: z.enum(Object.values(OwnerKind)), ownerId: id },
  "content.import": { kind: z.enum(IMPORT_KINDS) }, "content.export": { kind: z.enum(IMPORT_KINDS) }, "content.import-example": { kind: z.enum(IMPORT_KINDS) },
};

export function contentOperationSchema(operationId: ContentOperationId) {
  const operation = CONTENT_OPERATIONS[operationId];

  return z.object({ ...paths[operationId], ...(operationId === "source.diff" ? { offset: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(50).default(20) } : {}), ...("body" in operation ? { body: operation.body } : {}), ...("query" in operation ? { query: operation.query.optional() } : {}) });
}
export type OperationInput = z.infer<ReturnType<typeof contentOperationSchema>>;

type BodyOf<K extends ContentOperationId> = (typeof CONTENT_OPERATIONS)[K] extends { body: infer B extends z.ZodType } ? z.output<B> : never;

// contentOperationSchema already validated the body; this only narrows the type.
const bodyOf = <K extends ContentOperationId>(_id: K, body: unknown) => body as BodyOf<K>;

const kindOf = (value: unknown) => value as (typeof IMPORT_KINDS)[number];

async function owned<T extends { campaignId: string }>(row: T | null, actor: Actor, message: string = API_ERRORS.NOT_FOUND): Promise<T> {
  if (!row || row.campaignId !== actor.campaignId) throw new ContentError(message, 404);

  return row;
}

const invalidate = (actor: Actor, kind: ReferenceKindValue) => afterContentCommit(() => invalidateReference(kind, actor.campaignId));

async function owner(kind: OwnerKind, actor: Actor, ownerId: string) {
  const where = { id: ownerId, campaignId: actor.campaignId };

  switch (kind) {
    case OwnerKind.SKILL: return prisma.skill.findFirst({ where });
    case OwnerKind.RACE: return prisma.race.findFirst({ where });
    case OwnerKind.ARTIFACT: return prisma.artifact.findFirst({ where });
    case OwnerKind.ARTIFACT_SET: return prisma.artifactSet.findFirst({ where });
    case OwnerKind.UNIT: return prisma.unit.findFirst({ where });
    case OwnerKind.CLASS: return prisma.gameClass.findFirst({ where });
    case OwnerKind.FEAT: return prisma.feat.findFirst({ where });
  }
}

/** Shared HTTP/action operation. It owns authorization, parsing and the write lock. */
export async function runContentOperation(operationId: ContentOperationId, actor: Actor, raw: unknown, locale?: Locale | null): Promise<unknown> {
  const operation = CONTENT_OPERATIONS[operationId];

  assertCan(actor, operation.need);

  if (operationId === "abilities.get" && (!raw || typeof raw !== "object" || !Object.values(OwnerKind).includes((raw as { kind: OwnerKind }).kind))) throw new ContentError(API_ERRORS.UNKNOWN_OWNER_KIND, 400);

  // Each branch narrows against its existing operation schema below. Dynamic
  // path schemas remain explicit, never model-provided arbitrary delegates.
  const input = parseInput(contentOperationSchema(operationId), raw) as Record<string, unknown>;

  const body = "body" in input ? input.body : undefined;

  const param = (key: string) => String((input as Record<string, unknown>)[key]);

  const work = async () => {
    switch (operationId) {
      case "rules.get": return readCampaignRules(actor);
      case "rules.update": return updateCampaignRules(actor, bodyOf("rules.update", body));
      case "campaign.export": return exportCampaign(prisma, actor.campaignId);
      case "source.diff": return getSourceDiff(actor, CONTENT_OPERATIONS["source.diff"].query.parse(input.query ?? {}).scope);
      case "source.apply": return applySource(actor, bodyOf("source.apply", body));
      case "skill-trees.list": return listSkillTrees(actor);
      case "skill-trees.save": return saveSkillTree(actor, { ...bodyOf("skill-trees.save", body), ...(input.treeId ? { treeId: String(input.treeId) } : {}) });
      case "content.import": {
        const report = await importContent(actor, kindOf(input.kind), bodyOf("content.import", body));

        if (locale === null) return report;

        return locale ? translateImportReport(await getTranslator(locale), report) : translatedImport(report);
      }
      case "content.import-example": return exampleCsv(actor, kindOf(input.kind), { loadNames, locale });
      case "content.export": return exportCsv(actor, kindOf(input.kind), { ...EXPORT_DEFAULT_DEPS, locale });
      case "abilities.sources": {
        const where = { campaignId: actor.campaignId }, select = { id: true, name: true } as const;

        const groups = await Promise.all([prisma.skill.findMany({ where, select }), prisma.race.findMany({ where, select }), prisma.artifact.findMany({ where, select }), prisma.artifactSet.findMany({ where, select }), prisma.unit.findMany({ where, select }), prisma.gameClass.findMany({ where, select }), prisma.feat.findMany({ where, select })]);

        const kinds = ["skill", "race", "artifact", "artifactSet", "unit", "class", "feat"];

        return { sources: groups.flatMap((rows, i) => rows.map((row) => ({ kind: kinds[i], id: row.id, name: row.name })).sort((a, b) => a.name.localeCompare(b.name, "uk"))) };
      }
      case "abilities.get": {
        const kind = input.kind as OwnerKind;

        const row = await owner(kind, actor, param("ownerId"));

        if (!row) throw new ContentError(API_ERRORS.NOT_FOUND, 404);

        if (kind === OwnerKind.CLASS && "features" in row) {
          const cls = toGameClassData(row);

          return { abilities: [...cls.features, ...cls.subclasses.flatMap(s => s.features)].flatMap(f => f.abilities) };
        }

        return { abilities: readAbilities(kind, row).abilities };
      }
      case "skills.duplicate": {
        const source = await owned(await prisma.skill.findUnique({ where: { id: param("skillId") } }), actor, API_ERRORS.SKILL_NOT_FOUND);

        const t = await getTranslator(locale ?? await getRequestLocale().catch(() => DEFAULT_LOCALE), "assistant");

        const skill = await prisma.skill.create({ data: {
          campaignId: actor.campaignId, name: source.name.trim() ? t("defaults.copyOf", { name: source.name }) : t("defaults.skillCopy"), description: source.description, icon: source.icon, image: source.image ?? null,
          spellId: source.spellId, spellGroupId: source.spellGroupId, grantedSpellId: source.grantedSpellId, mainSkillId: source.mainSkillId, spellNewSpellId: source.grantedSpellId, abilities: abilitiesJson(skillAbilities(source)),
        }, include: { spell: true, spellGroup: true, grantedSpell: true, mainSkill: true } });

        invalidate(actor, ReferenceKind.SKILLS);

 return skill;
      }
      case "spells.remove-from-group": {
        await owned(await prisma.spell.findUnique({ where: { id: param("spellId") } }), actor);

        const result = await prisma.spell.update({ where: { id: param("spellId") }, data: { groupId: null }, include: { spellGroup: true } });

        invalidate(actor, ReferenceKind.SPELLS);

 return result;
      }
      case "spell-groups.remove-all-spells": {
        await owned(await prisma.spellGroup.findUnique({ where: { id: param("groupId") } }), actor);
        await prisma.spell.updateMany({ where: { campaignId: actor.campaignId, groupId: param("groupId") }, data: { groupId: null } });
        invalidate(actor, ReferenceKind.SPELLS);

 return { ok: true };
      }
      case "spells.delete-by-level": {
        const { level } = bodyOf("spells.delete-by-level", body);

        const result = await prisma.spell.deleteMany({ where: { campaignId: actor.campaignId, level } });

        invalidate(actor, ReferenceKind.SPELLS);

 return { ok: true, deleted: result.count };
      }
      case "units.import": {
        const { units } = bodyOf("units.import", body);

        await assertCampaignRefs(actor.campaignId, { spell: units.flatMap((unit) => unit.knownSpells) });

        const result = await importUnitsIntoCampaign(prisma, actor.campaignId, units);

        invalidate(actor, ReferenceKind.UNITS);

 return result;
      }
      case "tracks.reorder": {
        const { ids } = bodyOf("tracks.reorder", body);

        const known = new Set((await prisma.campaignTrack.findMany({ where: { campaignId: actor.campaignId }, select: { id: true } })).map((row) => row.id));

        if (ids.length !== known.size || new Set(ids).size !== ids.length || !ids.every((trackId) => known.has(trackId))) throw new ContentError(API_ERRORS.TRACK_ORDER_MISMATCH, 400);

        for (const [sortOrder, trackId] of ids.entries()) await prisma.campaignTrack.update({ where: { id: trackId }, data: { sortOrder } });

        return listTracks(actor.campaignId);
      }
    }
  };

  // The row importer owns per-row commits for ordinary HTTP use. In the
  // assistant it reuses the enclosing transaction and savepoints.
  if (operation.method === "GET" || operationId === "content.import") return work();

  return withCampaignContentWrite(actor.campaignId, work);
}
