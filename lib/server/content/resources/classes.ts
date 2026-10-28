import { type GameClass as ClassRow,Prisma } from "@prisma/client";
import type { z } from "zod";

import "server-only";
import { getCachedClasses } from "@/lib/cache/reference-data";
import { ReferenceKind } from "@/lib/cache/tags";
import { API_ERRORS, classNameTakenMessage } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { createClassSchema, updateClassSchema } from "@/lib/schemas";
import { classNameTaken } from "@/lib/server/classes/class-name";
import { defineResource } from "@/lib/server/content/define-resource";
import { ContentError } from "@/lib/server/content/errors";
import { toGameClassData } from "@/lib/utils/characters/classes/row";

type CreateInput = z.infer<typeof createClassSchema>;
type UpdateInput = z.infer<typeof updateClassSchema>;

const json = (v: unknown) => v as Prisma.InputJsonValue;

async function assertNameFree(campaignId: string, name: string, exceptId?: string) {
  if (await classNameTaken(campaignId, name, exceptId)) throw new ContentError(classNameTakenMessage(name), 409);
}

function updateData(data: UpdateInput): Prisma.GameClassUncheckedUpdateInput {
  const { savingThrows, proficiencies, skillChoices, features, subclasses, ...rest } = data;

  return {
    ...rest,
    ...(savingThrows && { savingThrows: json(savingThrows) }),
    ...(proficiencies && { proficiencies: json(proficiencies) }),
    ...(skillChoices && { skillChoices: json(skillChoices) }),
    ...(features && { features: json(features) }),
    ...(subclasses && { subclasses: json(subclasses) }),
  };
}

export const classesResource = defineResource<ClassRow, CreateInput, UpdateInput>({
  kind: "classes",
  listFields: ["color", "caster", "hitDie"],
  idParam: "classId",
  label: "Класи",
  description: "Класи 5e: кістка хітів, рятівні кидки, тип заклинача, вміння за рівнями, підкласи.",
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

    return prisma.gameClass.create({
      data: {
        campaignId: actor.campaignId,
        name: data.name,
        icon: data.icon ?? null,
        color: data.color ?? null,
        hitDie: data.hitDie,
        savingThrows: json(data.savingThrows),
        proficiencies: json(data.proficiencies),
        skillChoices: json(data.skillChoices),
        caster: data.caster,
        spellcastingAbility: data.spellcastingAbility,
        features: json(data.features),
        subclassLevel: data.subclassLevel,
        subclasses: json(data.subclasses),
      },
    });
  },
  async update(actor, existing, data) {
    if (data.name !== undefined) await assertNameFree(actor.campaignId, data.name, existing.id);

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
