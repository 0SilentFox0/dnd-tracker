import { AttackType, BATTLE_CONSTANTS } from '@/lib/constants/battle';

export function matchesAttackBonusModifier(
    modifierType: string,
    attackType: AttackType
): boolean {
    const s = modifierType.toLowerCase();

    if (s.includes('disadvantage')) return false;

    if (!s.includes('attack')) return false;

    if (s.includes(AttackType.RANGED)) return attackType === AttackType.RANGED;

    if (s.includes(AttackType.MELEE)) return attackType === AttackType.MELEE;

    return true;
}

export function calculatePercentBonus(
    baseValue: number,
    percentBonus: number
): number {
    if (percentBonus <= 0) return 0;

    return Math.floor(
        baseValue * (percentBonus / BATTLE_CONSTANTS.PERCENT_DIVISOR)
    );
}
