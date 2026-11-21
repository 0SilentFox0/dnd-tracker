import { readStats } from './guard';
import type { QualityRef } from './qualities';
import type { WfrpWeaponStats } from './stats';

export type WeaponProfile = {
    range: 'melee' | 'ranged';
    group?: WfrpWeaponStats['group'];
    cells?: number;
    rangeFt?: number;
    /** Thrown weapons: Range is SB times this (Rock SB x3), counted when the fighter is built */
    rangeSb?: number;
    damageFlat: number;
    addSb: boolean;
    qualities: QualityRef[];
    flaws: QualityRef[];
    ammoCapacity?: number;
    twoHanded: boolean;
    bladed?: true;
};

// Matches wfrp `distance` (2 yd per cell); the registry cannot be imported from here without a cycle
export const WFRP_CELL_FEET = 6;

// legacy only; canon engage range is canonEngageCells (p166)
const REACH_FEET: Record<NonNullable<WfrpWeaponStats['reach']>, number> = {
    personal: 3,
    'very-short': 3,
    short: 6,
    average: 6,
    long: 12,
    'very-long': 18,
    massive: 24,
};

export const REACH_RANK: Record<
    NonNullable<WfrpWeaponStats['reach']>,
    number
> = {
    personal: 0,
    'very-short': 1,
    short: 2,
    average: 3,
    long: 4,
    'very-long': 5,
    massive: 6,
};

/** Canon Engage distance: 2 yd, Very Long 4 yd, Massive 6 yd; a cell is 2 yd (p300) */
export const canonEngageCells = (
    reach: NonNullable<WfrpWeaponStats['reach']>
): number => (reach === 'massive' ? 3 : reach === 'very-long' ? 2 : 1);

const cellsOf = (feet: number) => Math.max(1, Math.ceil(feet / WFRP_CELL_FEET));

export function weaponProfile(stats: unknown): WeaponProfile | null {
    const s = readStats(stats);

    if (s?.type !== 'weapon') return null;

    const common = {
        group: s.group,
        damageFlat: s.damage.flat,
        addSb: s.damage.addSb,
        qualities: s.qualities,
        flaws: s.flaws,
        twoHanded: s.twoHanded,
        ...(s.bladed && { bladed: true as const }),
        ...(s.ammoCapacity !== undefined && { ammoCapacity: s.ammoCapacity }),
    };

    if (s.range !== undefined)
        return {
            range: 'ranged',
            cells: cellsOf(s.range),
            rangeFt: s.range,
            ...(s.rangeSb !== undefined && { rangeSb: s.rangeSb }),
            ...common,
        };

    return {
        range: 'melee',
        cells: cellsOf(REACH_FEET[s.reach ?? 'average']),
        ...common,
    };
}
