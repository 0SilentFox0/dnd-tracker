import { Prisma, type Race as RaceRow } from "@prisma/client";
import type { z } from "zod";

import "server-only";
import { getCachedRaces } from "@/lib/cache/reference-data";
import { ReferenceKind } from "@/lib/cache/tags";
import { API_ERRORS, raceNameTakenMessage } from "@/lib/constants/api-errors";
import { raceColorAt } from "@/lib/constants/race-colors";
import { prisma } from "@/lib/db";
import { createRaceSchema, updateRaceSchema } from "@/lib/schemas";
import { addedIds, assertCampaignRefs } from "@/lib/server/campaigns/campaign-refs";
import { defineResource } from "@/lib/server/content/define-resource";
import { ContentError } from "@/lib/server/content/errors";
import { raceNameTaken } from "@/lib/server/races/race-name";
import { updateRaceCascade } from "@/lib/server/races/update-race";
import { abilitiesJson, withAbilityIssues } from "@/lib/utils/abilities/read";

async function assertNameFree(campaignId: string, name: string, exceptId?: string) {
  if (await raceNameTaken(campaignId, name, exceptId)) throw new ContentError(raceNameTakenMessage(name), 409);
}

export const racesResource = defineResource<RaceRow, z.infer<typeof createRaceSchema>, z.infer<typeof updateRaceSchema>>({
  kind: "races",
  idParam: "raceId",
  label: "Раси",
  description: "Ігрові раси: колір, іконка, доступні скіли, прогресія слотів, расові здібності.",
  path: "/races",
  schemas: { create: createRaceSchema, update: updateRaceSchema },
  access: { list: "member", item: "dm" },
  invalidates: [ReferenceKind.RACES, ReferenceKind.UNITS],
  notFound: API_ERRORS.RACE_NOT_FOUND,
  list: (actor) => getCachedRaces(actor.campaignId),
  find: (actor, id) => prisma.race.findFirst({ where: { id, campaignId: actor.campaignId } }),
  toItem: (row) => withAbilityIssues("race", row),
  async create(actor, data) {
    await assertNameFree(actor.campaignId, data.name);
    await assertCampaignRefs(actor.campaignId, { mainSkill: data.availableSkills, skill: data.disabledSkills });

    const color = data.color ?? raceColorAt(await prisma.race.count({ where: { campaignId: actor.campaignId } }));

    return prisma.race.create({
      data: {
        campaignId: actor.campaignId,
        name: data.name,
        icon: data.icon ?? null,
        color,
        availableSkills: data.availableSkills as Prisma.InputJsonValue,
        disabledSkills: data.disabledSkills as Prisma.InputJsonValue,
        passiveAbility: data.passiveAbility ? (data.passiveAbility as Prisma.InputJsonValue) : Prisma.JsonNull,
        spellSlotProgression: data.spellSlotProgression ? (data.spellSlotProgression as Prisma.InputJsonValue) : [],
        ...(data.abilities && { abilities: abilitiesJson(data.abilities) }),
      },
    });
  },
  async update(actor, existing, data) {
    if (data.name !== undefined) await assertNameFree(actor.campaignId, data.name, existing.id);

    await assertCampaignRefs(actor.campaignId, {
      mainSkill: addedIds(data.availableSkills, existing.availableSkills),
      skill: addedIds(data.disabledSkills, existing.disabledSkills),
    });

    return updateRaceCascade(actor.campaignId, existing, data);
  },
  async remove(actor, existing) {
    await prisma.race.deleteMany({ where: { id: existing.id, campaignId: actor.campaignId } });
  },
});
