import { prisma } from "@/lib/db";
import { fullSpellSlots } from "@/lib/utils/spells/spell-slots";
import type { SpellSlotProgression } from "@/types/races";

type SpellSlots = Record<string, { max: number; current: number }>;

export const EMPTY_INVENTORY = { equipped: {}, backpack: [], gold: 0, silver: 0, copper: 0, items: [], stash: [] };

export async function deriveCharacterDefaults(
  campaignId: string,
  input: { level: number; race: string; spellSlots?: SpellSlots },
): Promise<{ spellSlots: SpellSlots }> {
  if (input.spellSlots && typeof input.spellSlots === "object" && Object.keys(input.spellSlots).length > 0) return { spellSlots: input.spellSlots };

  const race = await prisma.race.findFirst({ where: { campaignId, name: input.race }, select: { spellSlotProgression: true } });

  return {
    spellSlots: fullSpellSlots(input.level, Array.isArray(race?.spellSlotProgression) ? (race.spellSlotProgression as unknown as SpellSlotProgression[]) : null),
  };
}
