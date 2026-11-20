import {
    BREATH_BASE_YD,
    BREATH_DAMAGE,
    FEET_PER_YARD,
} from './constants';

import type { BreathKind } from '@/systems/wfrp/rules/trait-kinds';

/** Breath damage from the breather's own Strength or Toughness Bonus (p358) */
export function breathDamage(
    kind: BreathKind,
    stats: { sb: number; tb: number }
): number {
    const d = BREATH_DAMAGE[kind];

    return 'none' in d ? 0 : stats[d.stat] + d.add;
}

export const breathRangeFt = (tb: number): number =>
    (BREATH_BASE_YD + tb) * FEET_PER_YARD;

/** Cells of blast radius for "everyone within SB yards of the target" (one cell is two yards) */
export const breathBlastCells = (sb: number): number =>
    Math.max(1, Math.floor(sb / 2));
