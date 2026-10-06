/**
 * Побудова об'єкта оновлення персонажа: рівень, HP, пасивні скіли, spell slots тощо.
 */

import { Prisma } from "@prisma/client";

import { seenLevelOnLevelChange } from "@/lib/utils/characters/seen-level";
import { calculateHPGain, getAbilityModifier, getLevelFromXP } from "@/lib/utils/common/calculations";
import { calculateCharacterSpellSlots } from "@/lib/utils/spells/spell-slots";

export interface BuildCharacterUpdateDataParams {
  character: {
    level: number;
    constitution: number;
    maxHp: number;
    currentHp: number;
    hitDice: string | null;
    spellSlots: unknown;
    immunities: unknown;
    [key: string]: unknown;
  };
  data: Record<string, unknown> & {
    level?: number;
    experience?: number;
    constitution?: number;
    maxHp?: number;
    currentHp?: number;
    spellSlots?: Record<string, { max: number; current: number }>;
    immunities?: unknown;
    [key: string]: unknown;
  };
  xpMultiplier: number;
}

export function buildCharacterUpdateData({
  character,
  data,
  xpMultiplier,
}: BuildCharacterUpdateDataParams): {
  finalLevel: number;
  maxHp: number;
  currentHp: number;
  spellSlotsToSave: Record<string, { max: number; current: number }>;
  skillTreeProgressUpdate: Prisma.InputJsonValue | undefined;
  seenLevel: number | undefined;
} {
  const level = (data.level ?? character.level) as number;

  const experience = (data.experience ?? character.experience) as number;

  const constitution = (data.constitution ?? character.constitution) as number;

  const hitDice = character.hitDice as string;

  const newLevelFromXP = getLevelFromXP(experience, xpMultiplier);

  const finalLevel = Math.max(level, newLevelFromXP);

  const conMod = getAbilityModifier(constitution);

  let maxHp = (data.maxHp ?? character.maxHp) as number;

  let currentHp = (data.currentHp ?? character.currentHp) as number;

  if (finalLevel > character.level) {
    const levelsGained = finalLevel - character.level;

    for (let i = 0; i < levelsGained; i++) {
      const hpGain = calculateHPGain(hitDice ?? "1d8", conMod);

      maxHp += hpGain;
      currentHp += hpGain;
    }
  }

  const computedSlots = calculateCharacterSpellSlots(finalLevel);

  const existingSlots = (data.spellSlots ?? character.spellSlots) as
    | Record<string, { max: number; current: number }>
    | null
    | undefined;

  const spellSlotsToSave: Record<string, { max: number; current: number }> =
    Object.fromEntries(
      Object.entries(computedSlots).map(([k, v]) => {
        const existing = existingSlots?.[k]?.current;

        const current = existing !== undefined ? Math.min(existing, v.max) : v.max;

        return [k, { max: v.max, current }];
      }),
    );

  if (
    existingSlots?.universal &&
    typeof existingSlots.universal === "object" &&
    (existingSlots.universal as { max?: number }).max !== undefined
  ) {
    spellSlotsToSave.universal = existingSlots.universal as { max: number; current: number };
  }

  const skillTreeProgressUpdate = finalLevel < character.level ? ({} as Prisma.InputJsonValue) : undefined;

  const seenLevel = seenLevelOnLevelChange(character.level, finalLevel, (character.seenLevel as number | null | undefined) ?? null);

  return {
    finalLevel,
    maxHp,
    currentHp,
    spellSlotsToSave,
    skillTreeProgressUpdate,
    seenLevel,
  };
}
