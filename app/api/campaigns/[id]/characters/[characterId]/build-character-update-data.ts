/**
 * Побудова об'єкта оновлення персонажа: рівень, HP, пасивні скіли, spell slots тощо.
 */

import { Prisma } from "@prisma/client";

import {
  calculateHPGain,
  getAbilityModifier,
  getLevelFromXP,
  getPassiveScore,
  getProficiencyBonus,
  getSpellAttackBonus,
  getSpellSaveDC,
} from "@/lib/utils/common/calculations";
import { calculateCharacterSpellSlots } from "@/lib/utils/spells/spell-slots";

export interface BuildCharacterUpdateDataParams {
  character: {
    level: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
    maxHp: number;
    currentHp: number;
    hitDice: string | null;
    spellcastingAbility: string | null;
    spellSaveDC: number | null;
    spellAttackBonus: number | null;
    spellSlots: unknown;
    immunities: unknown;
    skills: unknown;
    [key: string]: unknown;
  };
  data: Record<string, unknown> & {
    level?: number;
    experience?: number;
    constitution?: number;
    intelligence?: number;
    wisdom?: number;
    charisma?: number;
    maxHp?: number;
    currentHp?: number;
    hitDice?: string;
    spellcastingAbility?: string | null;
    spellSlots?: Record<string, { max: number; current: number }>;
    immunities?: unknown;
    skillTreeProgress?: unknown;
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
  proficiencyBonus: number;
  passivePerception: number;
  passiveInvestigation: number;
  passiveInsight: number;
  spellSaveDC: number | null;
  spellAttackBonus: number | null;
  spellSlotsToSave: Record<string, { max: number; current: number }>;
  skillTreeProgressUpdate: Prisma.InputJsonValue | undefined;
} {
  const level = (data.level ?? character.level) as number;

  const experience = (data.experience ?? character.experience) as number;

  const constitution = (data.constitution ?? character.constitution) as number;

  const intelligence = (data.intelligence ?? character.intelligence) as number;

  const wisdom = (data.wisdom ?? character.wisdom) as number;

  const charisma = (data.charisma ?? character.charisma) as number;

  const hitDice = (data.hitDice ?? character.hitDice) as string;

  const characterSkills = (data.skills ?? character.skills) as Record<string, boolean>;

  const newLevelFromXP = getLevelFromXP(experience, xpMultiplier);

  const finalLevel = Math.max(level, newLevelFromXP);

  const proficiencyBonus = getProficiencyBonus(finalLevel);

  const conMod = getAbilityModifier(constitution);

  const intMod = getAbilityModifier(intelligence);

  const wisMod = getAbilityModifier(wisdom);

  const chaMod = getAbilityModifier(charisma);

  const passivePerception = getPassiveScore(
    wisMod,
    characterSkills?.perception || false,
    proficiencyBonus,
  );

  const passiveInvestigation = getPassiveScore(
    intMod,
    characterSkills?.investigation || false,
    proficiencyBonus,
  );

  const passiveInsight = getPassiveScore(
    wisMod,
    characterSkills?.insight || false,
    proficiencyBonus,
  );

  const spellcastingAbility =
    (data.spellcastingAbility ?? character.spellcastingAbility) as string | null;

  let spellSaveDC: number | null = character.spellSaveDC;

  let spellAttackBonus: number | null = character.spellAttackBonus;

  if (spellcastingAbility) {
    const abilityMod =
      spellcastingAbility === "intelligence"
        ? intMod
        : spellcastingAbility === "wisdom"
          ? wisMod
          : chaMod;

    spellSaveDC = getSpellSaveDC(proficiencyBonus, abilityMod);
    spellAttackBonus = getSpellAttackBonus(proficiencyBonus, abilityMod);
  }

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

  const levelDecreased = finalLevel < character.level;

  const skillTreeProgressUpdate = levelDecreased
    ? ({} as Prisma.InputJsonValue)
    : data.skillTreeProgress !== undefined
      ? (data.skillTreeProgress as Prisma.InputJsonValue)
      : undefined;

  return {
    finalLevel,
    maxHp,
    currentHp,
    proficiencyBonus,
    passivePerception,
    passiveInvestigation,
    passiveInsight,
    spellSaveDC,
    spellAttackBonus,
    spellSlotsToSave,
    skillTreeProgressUpdate,
  };
}
