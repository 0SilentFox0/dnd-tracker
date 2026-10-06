import { Prisma } from "@prisma/client";

import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import { applyLevelGain } from "@/lib/utils/characters/level-up/apply-level-gain";
import { seenLevelOnLevelChange } from "@/lib/utils/characters/seen-level";
import { getLevelFromXP } from "@/lib/utils/common/calculations";
import { calculateCharacterSpellSlots, type SpellSlots } from "@/lib/utils/spells/spell-slots";

type AbilityScores = Record<AbilityKey, number>;

export interface BuildCharacterUpdateDataParams {
  character: AbilityScores & { level: number; experience: number; spellSlots: unknown; seenLevel?: number | null };
  data: Partial<AbilityScores> & { level?: number; experience?: number; spellSlots?: SpellSlots; [key: string]: unknown };
  xpMultiplier: number;
  campaign: { maxLevel: number };
  race: { spellSlotProgression: unknown } | null;
  rng?: () => number;
}

export interface CharacterUpdateComputed {
  finalLevel: number;
  abilityScores?: AbilityScores;
  spellSlots?: SpellSlots;
  gained: AbilityKey[];
  skillTreeProgressUpdate: Prisma.InputJsonValue | undefined;
  seenLevel: number | undefined;
}

export function resolveFinalLevel(
  character: { level: number; experience: number },
  data: { level?: number; experience?: number },
  xpMultiplier: number,
): number {
  if (data.level === undefined && data.experience === undefined) return character.level;

  return Math.max(data.level ?? character.level, getLevelFromXP(data.experience ?? character.experience, xpMultiplier));
}

function tableSlots(level: number, existing: SpellSlots | null | undefined): SpellSlots {
  const slots: SpellSlots = Object.fromEntries(
    Object.entries(calculateCharacterSpellSlots(level)).map(([k, v]) => {
      const current = existing?.[k]?.current;

      return [k, { max: v.max, current: current !== undefined ? Math.min(current, v.max) : v.max }];
    }),
  );

  if (existing?.universal?.max !== undefined) slots.universal = existing.universal;

  return slots;
}

export function buildCharacterUpdateData({ character, data, xpMultiplier, campaign, race, rng }: BuildCharacterUpdateDataParams): CharacterUpdateComputed {
  const finalLevel = resolveFinalLevel(character, data, xpMultiplier);

  const existingSlots = (data.spellSlots ?? character.spellSlots) as SpellSlots | null | undefined;

  const common = {
    finalLevel,
    gained: [] as AbilityKey[],
    seenLevel: seenLevelOnLevelChange(character.level, finalLevel, character.seenLevel ?? null),
    skillTreeProgressUpdate: undefined as Prisma.InputJsonValue | undefined,
  };

  if (finalLevel > character.level) {
    const scores = Object.fromEntries(ABILITY_KEYS.map((k) => [k, data[k] ?? character[k]])) as AbilityScores;

    const gain = applyLevelGain({ character: { ...scores, spellSlots: existingSlots ?? {} }, race, campaign, fromLevel: character.level, toLevel: finalLevel, rng });

    return { ...common, abilityScores: gain.abilityScores, spellSlots: gain.spellSlots, gained: gain.gained };
  }

  if (finalLevel < character.level) {
    return { ...common, spellSlots: tableSlots(finalLevel, existingSlots), skillTreeProgressUpdate: {} as Prisma.InputJsonValue };
  }

  return common;
}
