/**
 * Визначення spell slots для participant з character (існуючі або з race/campaign)
 */

import type { CampaignSpellContext, CharacterFromPrisma } from "../types/participant";

import { prisma } from "@/lib/db";
import { calculateSpellSlotsForLevel } from "@/lib/utils/spells/spell-slots";
import type { SpellSlotProgression } from "@/types/races";

export async function resolveSpellSlotsFromCharacter(
  character: CharacterFromPrisma,
  context?: CampaignSpellContext,
): Promise<Record<string, { max: number; current: number }>> {
  const existingSlots =
    (character.spellSlots as Record<string, { max: number; current: number }>) || {};

  if (Object.keys(existingSlots).length > 0) {
    return Object.fromEntries(
      Object.entries(existingSlots).map(([k, v]) => [
        k,
        { max: v.max, current: v.max },
      ]),
    );
  }

  const race = context
    ? context.racesByName[character.race]
    : await prisma.race.findFirst({
        where: {
          campaignId: character.campaignId,
          name: character.race,
        },
      });

  const campaign = context ? context.campaign : await prisma.campaign.findUnique({
    where: { id: character.campaignId },
    select: { maxLevel: true },
  });

  const progression = (
    race?.spellSlotProgression
      ? Array.isArray(race.spellSlotProgression)
        ? (race.spellSlotProgression as unknown as SpellSlotProgression[])
        : []
      : []
  ) as SpellSlotProgression[];

  const maxLevel = campaign?.maxLevel ?? 20;

  const computed = calculateSpellSlotsForLevel(
    character.level,
    maxLevel,
    progression,
  );

  return Object.fromEntries(
    Object.entries(computed).map(([k, v]) => [
      k,
      { max: v.max, current: v.max },
    ]),
  );
}
