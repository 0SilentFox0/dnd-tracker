import { editionOf } from '../edition';
import { ATTACK_SLOT } from '../slots';
import { isFlier } from '../traits/creature';

import { cellFeetOf } from '@/lib/utils/battle/grid/cell-feet';
import { footprintDistance } from '@/lib/utils/battle/grid/geometry';
import { cellsOf } from '@/lib/utils/battle/grid/occupancy';
import type { ResolveAttackCtx } from '@/lib/utils/rules/systems/types';
import type { BattleParticipant } from '@/types/battle';

export type RangeBand = 'pointBlank' | 'short' | 'medium' | 'long' | 'extreme';

const BANDS: readonly RangeBand[] = [
    'pointBlank',
    'short',
    'medium',
    'long',
    'extreme',
];

/** A flying target is one band further away; past Extreme the shot cannot be made (p357) */
export const farther = (band: RangeBand | null): RangeBand | null =>
    band === null ? null : (BANDS[BANDS.indexOf(band) + 1] ?? null);

export const RANGE_BAND_SL: Record<RangeBand, number> = {
    pointBlank: 2,
    short: 1,
    medium: 0,
    long: -1,
    extreme: -2,
};

const POINT_BLANK_YD = 4;

const FEET_PER_YARD = 3;

/** Null = beyond Extreme: the shot cannot be made (p165, p302) */
export function rangeBandOf(
    distanceYd: number,
    rangeYd: number
): RangeBand | null {
    if (distanceYd <= POINT_BLANK_YD) return 'pointBlank';

    if (distanceYd <= rangeYd / 2) return 'short';

    if (distanceYd <= rangeYd) return 'medium';

    if (distanceYd <= rangeYd * 2) return 'long';

    return distanceYd <= rangeYd * 3 ? 'extreme' : null;
}

/** The weapon's Range in yards from the attack's first range number (feet) */
export function weaponRangeYd(range: string | undefined): number | null {
    const first = range?.match(/\d+/)?.[0];

    return first ? Number(first) / FEET_PER_YARD : null;
}

/** Thrown weapons: Range is Strength Bonus times a multiplier (Rock SB x3) */
export const sbRangeFt = (sb: number, multiplier: number): number =>
    Math.max(1, sb) * multiplier * FEET_PER_YARD;

export function pointBlankBetween(
    attacker: BattleParticipant,
    target: BattleParticipant,
    rules: ResolveAttackCtx['rules']
): boolean {
    if (!attacker.battleData.position || !target.battleData.position)
        return false;

    const cells = footprintDistance(
        cellsOf(attacker, 'square'),
        cellsOf(target, 'square')
    );

    return (cells * cellFeetOf(rules)) / FEET_PER_YARD <= POINT_BLANK_YD;
}

export function rangeContext(
    ctx: Pick<
        ResolveAttackCtx,
        'attacker' | 'target' | 'attack' | 'map' | 'rules'
    >
): { distanceYd: number; rangeYd: number; band: RangeBand | null } | null {
    const { attacker, target, attack, map, rules } = ctx;

    const rangeYd = weaponRangeYd(attack.range);

    // a helpless (unconscious) target is off the occupancy grid but still stands where it fell
    if (
        rangeYd === null ||
        !map ||
        !attacker.battleData.position ||
        !target.battleData.position
    )
        return null;

    const cells = footprintDistance(
        cellsOf(attacker, 'square'),
        cellsOf(target, 'square')
    );

    const distanceYd = (cells * cellFeetOf(rules)) / FEET_PER_YARD;

    if (editionOf(rules).traitModel === 'canon') {
        // Breath has one flat Range and no bands (p358)
        if (ATTACK_SLOT.read(attack.system)?.breath)
            return {
                distanceYd,
                rangeYd,
                band: distanceYd <= rangeYd ? 'medium' : null,
            };

        if (isFlier(target))
            return {
                distanceYd,
                rangeYd,
                band: farther(rangeBandOf(distanceYd, rangeYd)),
            };
    }

    return { distanceYd, rangeYd, band: rangeBandOf(distanceYd, rangeYd) };
}

export interface RangedOppositionCtx {
    band: RangeBand | null;
    /** The shooter is Engaged with the target (a Pistol at arm's length) */
    engaged: boolean;
    helpless: boolean;
    /** Breath: every target dodges, at any distance (p358) */
    dodgeAlways?: boolean;
    targets: { dodge: number; parry: number };
}

/** Who resists a ranged attack; empty = an unopposed test (p165-166) */
export function rangedOpposition(
    c: RangedOppositionCtx
): { kind: 'dodge' | 'parry'; target: number }[] {
    if (c.helpless) return [];

    if (c.engaged && !c.dodgeAlways)
        return [{ kind: 'parry', target: c.targets.parry }];

    return c.band === 'pointBlank' || c.dodgeAlways
        ? [{ kind: 'dodge', target: c.targets.dodge }]
        : [];
}
