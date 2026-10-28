import type { Background, Prisma } from "@prisma/client";
import type { z } from "zod";

import "server-only";
import { getCachedBackgrounds } from "@/lib/cache/reference-data";
import { ReferenceKind } from "@/lib/cache/tags";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { createBackgroundSchema, updateBackgroundSchema } from "@/lib/schemas/backgrounds";
import { backgroundInUse } from "@/lib/server/backgrounds/usage";
import { defineResource } from "@/lib/server/content/define-resource";
import { ContentError } from "@/lib/server/content/errors";
import { nameTaken } from "@/lib/server/content/name-taken";
import { backgroundAsiRules } from "@/lib/utils/backgrounds/asi";
import { backgroundSpellIds } from "@/lib/utils/backgrounds/references";
import { toBackgroundData } from "@/lib/utils/backgrounds/row";

const json = (v: unknown) => v as Prisma.InputJsonValue;


async function validateRefs(campaignId: string, originFeatId: string | null | undefined, choices?: unknown) {
  const ids = backgroundSpellIds(choices);

  if (ids.length && await prisma.spell.count({ where: { campaignId, id: { in: ids } } }) !== ids.length) throw new ContentError(API_ERRORS.FOREIGN_SPELL, 422);

  if (!originFeatId) return;

  const feat = await prisma.feat.findFirst({ where: { id: originFeatId, campaignId }, select: { id: true, type: true } });

  if (!feat || feat.type !== "origin") throw new ContentError(API_ERRORS.BACKGROUND_FEAT_INVALID, 422);
}

async function assertName(campaignId: string, name: string, exceptId?: string) {
  if (await nameTaken((where) => prisma.background.findFirst({ where, select: { id: true } }), campaignId, name, exceptId)) throw new ContentError(`Передісторія «${name}» вже існує`, 409);
}

export const backgroundsResource = defineResource<Background, z.infer<typeof createBackgroundSchema>, z.infer<typeof updateBackgroundSchema>>({
  kind: "backgrounds", idParam: "backgroundId", label: "Передісторії", description: "Передісторії: характеристики, навички, інструменти й риса походження.", path: "/backgrounds", listFields: ["originFeatId"],
  schemas: { create: createBackgroundSchema, update: updateBackgroundSchema }, errors: [409, 422],
  access: { list: "member", item: "dm" }, invalidates: [ReferenceKind.BACKGROUNDS], notFound: API_ERRORS.BACKGROUND_NOT_FOUND,
  list: async (actor) => (await getCachedBackgrounds(actor.campaignId)).map(toBackgroundData),
  toItem: toBackgroundData,
  find: (actor, id) => prisma.background.findFirst({ where: { id, campaignId: actor.campaignId } }),
  async create(actor, data) {
    await assertName(actor.campaignId, data.name);
    await validateRefs(actor.campaignId, data.originFeatId, data.choices);

    return prisma.background.create({ data: { ...data, campaignId: actor.campaignId, choices: json(data.choices), skillProficiencies: json(data.skillProficiencies), toolProficiencies: json(data.toolProficiencies) } });
  },
  async update(actor, existing, data) {
    if (data.name !== undefined) await assertName(actor.campaignId, data.name, existing.id);

    await validateRefs(actor.campaignId, data.originFeatId, data.choices);

    if (data.choices !== undefined && JSON.stringify(backgroundAsiRules(existing.choices)) !== JSON.stringify(backgroundAsiRules(data.choices)) && await backgroundInUse(actor.campaignId, existing.id)) throw new ContentError(API_ERRORS.BACKGROUND_ASI_IN_USE, 409);

    if (data.originFeatId !== undefined && data.originFeatId !== existing.originFeatId) {
      const load = async (id: string | null) => id ? backgroundAsiRules((await prisma.feat.findFirst({ where: { id, campaignId: actor.campaignId }, select: { choices: true } }))?.choices) : [];

      const [before, after] = await Promise.all([load(existing.originFeatId), load(data.originFeatId)]);

      if (JSON.stringify(before) !== JSON.stringify(after) && await backgroundInUse(actor.campaignId, existing.id)) throw new ContentError(API_ERRORS.BACKGROUND_ASI_IN_USE, 409);
    }

    const { choices, skillProficiencies, toolProficiencies, ...rest } = data;

    return prisma.background.update({ where: { id: existing.id }, data: { ...rest, ...(choices !== undefined && { choices: json(choices) }), ...(skillProficiencies !== undefined && { skillProficiencies: json(skillProficiencies) }), ...(toolProficiencies !== undefined && { toolProficiencies: json(toolProficiencies) }) } });
  },
  async remove(actor, existing) {
    if (await backgroundInUse(actor.campaignId, existing.id)) throw new ContentError(API_ERRORS.BACKGROUND_IN_USE, 409);

    await prisma.background.deleteMany({ where: { id: existing.id, campaignId: actor.campaignId } });
  },
});
