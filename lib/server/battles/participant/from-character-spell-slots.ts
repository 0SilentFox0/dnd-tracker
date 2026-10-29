import { prisma } from "@/lib/db";
import type { CampaignSpellContext, CharacterFromPrisma } from "@/lib/utils/battle/types/participant";
import { classSpellSlots } from "@/lib/utils/spells/class-slots";
import { calculateSpellSlotsForLevel } from "@/lib/utils/spells/spell-slots";
import type { ResolvedClassEntry } from "@/types/classes";
import type { SpellSlotProgression } from "@/types/races";

export async function resolveSpellSlotsFromCharacter(
  character: CharacterFromPrisma,
  context?: CampaignSpellContext,
  classes?: ResolvedClassEntry[],
): Promise<Record<string, { max: number; current: number; level?: number }>> {
  if (classes) {
    return Object.fromEntries(Object.entries(classSpellSlots(classes)).map(([k, v]) => [k, { ...v, current: v.max }]));
  }

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
