import { type GameClass as ClassRow,Prisma } from "@prisma/client";
import type { z } from "zod";

import "server-only";
import { getCachedClasses } from "@/lib/cache/reference-data";
import { ReferenceKind } from "@/lib/cache/tags";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { createClassSchema, updateClassSchema } from "@/lib/schemas";
import { addedIds, assertCampaignRefs } from "@/lib/server/campaigns/campaign-refs";
import { classNameTaken } from "@/lib/server/classes/class-name";
import { defineResource } from "@/lib/server/content/define-resource";
import { ContentError } from "@/lib/server/content/errors";
import { columnRefIssues } from "@/lib/utils/abilities/class-columns";
import { choiceColumnIssues } from "@/lib/utils/characters/choices/columns";
import { choiceSpellIds } from "@/lib/utils/characters/choices/read";
import { toGameClassData } from "@/lib/utils/characters/classes/row";
import { toInputJson } from "@/lib/utils/common/json";
import type { ClassFeature, Subclass } from "@/types/classes";

type CreateInput = z.infer<typeof createClassSchema>;
type UpdateInput = z.infer<typeof updateClassSchema>;

const spellRefs = (features: readonly ClassFeature[], subclasses: readonly Subclass[]) =>
  [...features, ...subclasses.flatMap(s => s.features)].flatMap(f => choiceSpellIds(f.choices) ?? []);

async function assertNameFree(campaignId: string, name: string, exceptId?: string) {
  if (await classNameTaken(campaignId, name, exceptId)) throw new ContentError(API_ERRORS.CLASS_NAME_TAKEN, 409, undefined, { name });
}

function updateData(data: UpdateInput): Prisma.GameClassUncheckedUpdateInput {
  const { savingThrows, proficiencies, skillChoices, features, subclasses, columns, ...rest } = data;

  return {
    ...rest,
    ...(savingThrows && { savingThrows: toInputJson(savingThrows) }),
    ...(proficiencies && { proficiencies: toInputJson(proficiencies) }),
    ...(skillChoices && { skillChoices: toInputJson(skillChoices) }),
    ...(features && { features: toInputJson(features) }),
    ...(subclasses && { subclasses: toInputJson(subclasses) }),
    ...(columns && { columns: toInputJson(columns) }),
  };
}

export const classesResource = defineResource<ClassRow, CreateInput, UpdateInput>({
  kind: "classes",
  listFields: ["color", "caster", "hitDie"],
  idParam: "classId",
  label: "Класи",
  description: "Класи 5e: кістка хітів, рятівні кидки, тип заклинача, вміння за рівнями, підкласи, таблиця класу (columns: 20 клітинок; pool — спільний пул).",
  path: "/classes",
  schemas: { create: createClassSchema, update: updateClassSchema },
  errors: [409],
  access: { list: "member", item: "dm" },
  invalidates: [ReferenceKind.CLASSES],
  notFound: API_ERRORS.CLASS_NOT_FOUND,
  list: async (actor) => (await getCachedClasses(actor.campaignId)).map(toGameClassData),
  toItem: toGameClassData,
  find: (actor, id) => prisma.gameClass.findFirst({ where: { id, campaignId: actor.campaignId } }),
  async create(actor, data) {
    await assertNameFree(actor.campaignId, data.name);
    await assertCampaignRefs(actor.campaignId, { spell: spellRefs(data.features, data.subclasses) });

    return prisma.gameClass.create({
      data: {
        campaignId: actor.campaignId,
        name: data.name,
        icon: data.icon ?? null,
        color: data.color ?? null,
        hitDie: data.hitDie,
        savingThrows: toInputJson(data.savingThrows),
        proficiencies: toInputJson(data.proficiencies),
        skillChoices: toInputJson(data.skillChoices),
        caster: data.caster,
        spellcastingAbility: data.spellcastingAbility,
        features: toInputJson(data.features),
        subclassLevel: data.subclassLevel,
        subclasses: toInputJson(data.subclasses),
        columns: toInputJson(data.columns),
        ...(data.spellList !== undefined && { spellList: data.spellList }),
      },
    });
  },
  async update(actor, existing, data) {
    if (data.name !== undefined) await assertNameFree(actor.campaignId, data.name, existing.id);

    const stored = toGameClassData(existing);

    await assertCampaignRefs(actor.campaignId, { spell: addedIds(spellRefs(data.features ?? stored.features, data.subclasses ?? stored.subclasses), spellRefs(stored.features, stored.subclasses)) });

    const columns = data.columns ?? stored.columns ?? [];

    const features = data.columns === undefined ? (data.features ?? []) : (data.features ?? stored.features);

    const subclasses = data.columns === undefined ? (data.subclasses ?? []) : (data.subclasses ?? stored.subclasses ?? []);

    const issues = [...features, ...subclasses.flatMap((s) => s.features)].flatMap((f) => [...columnRefIssues(f.abilities, columns), ...choiceColumnIssues(f.choices, columns)]);

    if (issues.length > 0) throw new ContentError(API_ERRORS.CLASS_COLUMN_UNKNOWN, 400, issues);

    return prisma.gameClass.update({ where: { id: existing.id }, data: updateData(data) });
  },
  async remove(actor, existing) {
    const used = await prisma.character.count({
      where: { campaignId: actor.campaignId, classes: { array_contains: [{ classId: existing.id }] } },
    });

    if (used > 0) throw new ContentError(API_ERRORS.CLASS_IN_USE, 409);

    await prisma.gameClass.deleteMany({ where: { id: existing.id, campaignId: actor.campaignId } });
  },
});
