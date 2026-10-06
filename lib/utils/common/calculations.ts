// Утиліти для розрахунків D&D

import { ABILITY_LABELS } from "@/lib/constants/abilities";
import { AttackType } from "@/lib/constants/battle";
import type { AbilityKey } from "@/types/characters";

/**
 * Розраховує модифікатор з ability score
 * Формула: (score - 10) / 2 (rounded down)
 */
export function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Розраховує proficiency bonus залежно від рівня
 */
export function getProficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1;
}

/**
 * Розраховує Spell Save DC
 * Формула: 8 + proficiency bonus + ability modifier
 */
export function getSpellSaveDC(
  proficiencyBonus: number,
  abilityModifier: number
): number {
  return 8 + proficiencyBonus + abilityModifier;
}

/**
 * Розраховує Spell Attack Bonus
 * Формула: proficiency bonus + ability modifier
 */
export function getSpellAttackBonus(
  proficiencyBonus: number,
  abilityModifier: number
): number {
  return proficiencyBonus + abilityModifier;
}

/**
 * Розраховує XP для рівня
 * Level 1 = 1000 XP
 * Кожен наступний рівень = попередній × multiplier
 */
export function getXPForLevel(level: number, multiplier: number = 2.5): number {
  if (level === 1) return 1000;

  return Math.floor(getXPForLevel(level - 1, multiplier) * multiplier);
}

/**
 * Розраховує рівень на основі XP
 */
export function getLevelFromXP(xp: number, multiplier: number = 2.5): number {
  let level = 1;

  let requiredXP = 1000;

  while (xp >= requiredXP) {
    level++;
    requiredXP = Math.floor(requiredXP * multiplier);
  }

  return level;
}

/**
 * Розраховує чи попадання успішне
 */
export function isHit(attackRoll: number, targetAC: number): boolean {
  return attackRoll >= targetAC;
}


type AttackAbilities = { strength: number; dexterity: number; primaryAbility?: AbilityKey | null } & Partial<Record<AbilityKey, number>>;

export function attackAbilityKey(abilities: { primaryAbility?: AbilityKey | null }, attackType: AttackType | string): AbilityKey {
  return abilities.primaryAbility ?? (attackType === AttackType.MELEE ? "strength" : "dexterity");
}

export function attackAbilityLabel(abilities: { primaryAbility?: AbilityKey | null }, attackType: AttackType | string): string {
  const key = attackAbilityKey(abilities, attackType);

  return ABILITY_LABELS[key];
}

export function getAttackAbilityModifier(abilities: AttackAbilities, attackType: AttackType | string): number {
  return getAbilityModifier(abilities[attackAbilityKey(abilities, attackType)] ?? 10);
}

export function spellcastingDerived(
  level: number,
  ability: string | null | undefined,
  scores: Record<AbilityKey, number>,
): { saveDC: number; attackBonus: number } | null {
  if (!ability || !(ability in scores)) return null;

  const prof = getProficiencyBonus(level);

  const mod = getAbilityModifier(scores[ability as AbilityKey]);

  return { saveDC: getSpellSaveDC(prof, mod), attackBonus: getSpellAttackBonus(prof, mod) };
}
