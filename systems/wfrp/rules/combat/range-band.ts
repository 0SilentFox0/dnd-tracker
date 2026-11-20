import { FEET_PER_YARD, POINT_BLANK_YARDS, RANGE_BAND_SL } from './constants';

import { footprintDistance } from '@/lib/utils/battle/grid/geometry';
import { cellsOf } from '@/lib/utils/battle/grid/occupancy';
import type { BattleAttack, BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

export type RangeBand = keyof typeof RANGE_BAND_SL;

/** Range band of a shot at `yards`, or null beyond Extreme (3x Medium); Point Blank wins over Short (p302) */
export function rangeBandOf(
    yards: number,
    mediumYards: number
): RangeBand | null {
    if (yards <= POINT_BLANK_YARDS) return 'pointBlank';

    if (yards <= mediumYards / 2) return 'short';

    if (yards <= mediumYards) return 'medium';

    if (yards <= mediumYards * 2) return 'long';

    return yards <= mediumYards * 3 ? 'extreme' : null;
}

/** Medium range in yards: the first number of the attack's `range` text, in feet (p302) */
export function mediumYardsOf(attack: BattleAttack): number | undefined {
    const first = attack.range?.match(/\d+/)?.[0];

    return first ? Number(first) / FEET_PER_YARD : undefined;
}

/** Band of the shot on the map; without positions or a range it is Medium */
export function shotBand(
    attacker: BattleParticipant,
    target: BattleParticipant,
    attack: BattleAttack,
    map: BattleMapConfig | null | undefined,
    cellFeet: number
): RangeBand {
    const medium = mediumYardsOf(attack);

    if (
        !map ||
        medium === undefined ||
        !attacker.battleData.position ||
        !target.battleData.position
    )
        return 'medium';

    const cells = footprintDistance(cellsOf(attacker), cellsOf(target));

    return rangeBandOf((cells * cellFeet) / FEET_PER_YARD, medium) ?? 'extreme';
}
