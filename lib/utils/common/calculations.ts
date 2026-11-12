// Утиліти для розрахунків D&D

import { AttackType } from '@/lib/constants/battle';
import type { AbilityKey } from '@/types/characters';

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
    abilityModifier: number,
    base = 8
): number {
    return base + proficiencyBonus + abilityModifier;
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
 * Розраховує чи попадання успішне
 */
export function isHit(attackRoll: number, targetAC: number): boolean {
    return attackRoll >= targetAC;
}

type AttackAbilities = {
    strength: number;
    dexterity: number;
    primaryAbility?: AbilityKey | null;
} & Partial<Record<AbilityKey, number>>;

export function attackAbilityKey(
    abilities: { primaryAbility?: AbilityKey | null },
    attackType: AttackType | string
): AbilityKey {
    return (
        abilities.primaryAbility ??
        (attackType === AttackType.MELEE ? 'strength' : 'dexterity')
    );
}

export function getAttackAbilityModifier(
    abilities: AttackAbilities,
    attackType: AttackType | string
): number {
    return getAbilityModifier(
        abilities[attackAbilityKey(abilities, attackType)] ?? 10
    );
}
