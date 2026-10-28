import type { Feat as FeatRow, Prisma } from "@prisma/client";
import type { z } from "zod";

import "server-only";
import { getCachedFeats } from "@/lib/cache/reference-data";
import { ReferenceKind } from "@/lib/cache/tags";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { createFeatSchema, updateFeatSchema } from "@/lib/schemas";
import { addedIds, assertCampaignRefs } from "@/lib/server/campaigns/campaign-refs";
import { defineResource } from "@/lib/server/content/define-resource";
import { ContentError } from "@/lib/server/content/errors";
import { featNameTaken } from "@/lib/server/feats/feat-name";
import { featAsiUsedByBackground, featInUse } from "@/lib/server/feats/feat-usage";
import { abilitiesJson } from "@/lib/utils/abilities/read";
import { backgroundAsiRules } from "@/lib/utils/backgrounds/asi";
import { choiceSpellIds, readChoices } from "@/lib/utils/characters/choices/read";
import { toFeatData } from "@/lib/utils/feats/row";

type CreateInput = z.infer<typeof createFeatSchema>;

type UpdateInput = z.infer<typeof updateFeatSchema>;

const json = (v: unknown) => v as Prisma.InputJsonValue;

async function assertNameFree(campaignId: string, name: string, exceptId?: string) {
  if (await featNameTaken(campaignId, name, exceptId)) throw new ContentError(API_ERRORS.FEAT_NAME_TAKEN, 409, undefined, { name });
}

export const featsResource = defineResource<FeatRow, CreateInput, UpdateInput>({
  kind: "feats",
  listFields: ["type", "repeatable"],
  idParam: "featId",
  label: "Риси",
  description: "Риси 5e: тип (origin/general/fightingStyle/epicBoon), передумови, повторюваність, вміння й вкладені вибори.",
  path: "/feats",
  schemas: { create: createFeatSchema, update: updateFeatSchema },
  errors: [409],
  access: { list: "member", item: "dm" },
  invalidates: [ReferenceKind.FEATS],
  notFound: API_ERRORS.FEAT_NOT_FOUND,
  list: async (actor) => (await getCachedFeats(actor.campaignId)).map(toFeatData),
  toItem: toFeatData,
  find: (actor, id) => prisma.feat.findFirst({ where: { id, campaignId: actor.campaignId } }),
  async create(actor, data) {
    await assertNameFree(actor.campaignId, data.name);
    await assertCampaignRefs(actor.campaignId, { spell: choiceSpellIds(data.choices) });

    return prisma.feat.create({
      data: {
        campaignId: actor.campaignId,
        name: data.name,
        icon: data.icon ?? null,
        type: data.type,
        prerequisite: json(data.prerequisite),
        repeatable: data.repeatable,
        description: data.description ?? null,
        abilities: abilitiesJson(data.abilities),
        choices: json(data.choices),
      },
    });
  },
  async update(actor, existing, data) {
    await assertCampaignRefs(actor.campaignId, { spell: addedIds(choiceSpellIds(data.choices), choiceSpellIds(readChoices(existing.choices)) ?? []) });

    if (data.name !== undefined) await assertNameFree(actor.campaignId, data.name, existing.id);

    if (data.type !== undefined && data.type !== "origin" && existing.type === "origin" && await prisma.background.findFirst({ where: { campaignId: actor.campaignId, originFeatId: existing.id }, select: { id: true } })) throw new ContentError(API_ERRORS.FEAT_IN_USE, 409);

    if (data.choices !== undefined && JSON.stringify(backgroundAsiRules(existing.choices)) !== JSON.stringify(backgroundAsiRules(data.choices)) && await featAsiUsedByBackground(actor.campaignId, existing.id)) throw new ContentError(API_ERRORS.BACKGROUND_ASI_IN_USE, 409);

    const { prerequisite, abilities, choices, ...rest } = data;

    return prisma.feat.update({
      where: { id: existing.id },
      data: { ...rest, ...(prerequisite && { prerequisite: json(prerequisite) }), ...(abilities && { abilities: abilitiesJson(abilities) }), ...(choices && { choices: json(choices) }) },
    });
  },
  async remove(actor, existing) {
    if (await featInUse(actor.campaignId, existing.id)) throw new ContentError(API_ERRORS.FEAT_IN_USE, 409);

    await prisma.feat.deleteMany({ where: { id: existing.id, campaignId: actor.campaignId } });
  },
});
