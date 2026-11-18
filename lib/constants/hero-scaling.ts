import { AttackType } from '@/lib/constants/battle';

export interface HeroScalingOptions {
    meleeDiceByLevel?: Record<number, string>;
    rangedDiceByLevel?: Record<number, string>;
}

const DEFAULT_DICE_BY_LEVEL: Record<number, string> = {
    1: '1d4',
    2: '1d6',
    3: '2d4',
    4: '1d4+1d6',
    5: '2d6',
    6: '1d6+1d8',
    7: '2d8',
    8: '2d6+1d8',
    9: '3d8',
    10: '3d8+1d4',
    11: '3d8+1d6',
    12: '4d8',
    13: '4d8+1d4',
    14: '4d8+1d6',
    15: '4d8+2d6',
    16: '5d8+1d4',
    17: '5d8+1d6',
    18: '6d8',
    19: '6d8+1d4',
    20: '6d8+1d6',
};

function getDiceForLevel(
    level: number,
    attackType: AttackType,
    opts?: HeroScalingOptions | null
): string {
    const table =
        attackType === AttackType.MELEE
            ? opts?.meleeDiceByLevel
            : opts?.rangedDiceByLevel;

    const clamped = Math.max(1, Math.min(20, level));

    return table?.[clamped] ?? DEFAULT_DICE_BY_LEVEL[clamped] ?? '1d4';
}

export function getHeroDamageDiceForLevel(
    level: number,
    attackType: AttackType,
    options?: HeroScalingOptions | null
): string {
    return getDiceForLevel(level, attackType, options);
}
