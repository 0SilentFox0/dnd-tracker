import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { UpdateRaceInput } from "@/lib/schemas";
import { abilitiesJson } from "@/lib/utils/abilities/read";

// characters.race and skill_trees.race reference the race by name
export async function updateRaceCascade(campaignId: string, current: { id: string; name: string }, data: UpdateRaceInput) {
  const renamed = data.name !== undefined && data.name !== current.name;

  return prisma.$transaction(async (tx) => {
    const race = await tx.race.update({
      where: { id: current.id },
      data: {
        name: data.name,
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.color !== undefined && { color: data.color }),
        availableSkills: data.availableSkills ? (data.availableSkills as Prisma.InputJsonValue) : undefined,
        disabledSkills: data.disabledSkills ? (data.disabledSkills as Prisma.InputJsonValue) : undefined,
        passiveAbility:
          data.passiveAbility !== undefined
            ? data.passiveAbility
              ? (data.passiveAbility as Prisma.InputJsonValue)
              : Prisma.JsonNull
            : undefined,
        spellSlotProgression:
          data.spellSlotProgression !== undefined ? (data.spellSlotProgression as Prisma.InputJsonValue) : undefined,
        abilities: data.abilities !== undefined ? abilitiesJson(data.abilities) : undefined,
      },
    });

    if (renamed) {
      await tx.character.updateMany({ where: { campaignId, race: current.name }, data: { race: data.name } });
      await tx.skillTree.updateMany({ where: { campaignId, race: current.name }, data: { race: data.name } });
    }

    return race;
  });
}
