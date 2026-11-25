import type { LastCast } from '../slots';
import { dispelRangeYards } from './dispel';

import { cellFeetOf } from '@/lib/utils/battle/grid/cell-feet';
import { cellDistance, gridOf } from '@/lib/utils/battle/grid/geometry';
import type { Ruleset } from '@/lib/utils/rules';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig, GridPoint } from '@/types/battle-grid';

const FEET_PER_YARD = 3;

/** Where a held spell is aimed: its landing cells, else the caster's own cell */
export const dispelSpotsOfCast = (
    last: LastCast,
    fallback?: GridPoint
): GridPoint[] => {
    if (last.targets?.length) return last.targets;

    const spot = last.at ?? fallback;

    return spot ? [spot] : [];
};

export const dispelSpotsOf = (holder: BattleParticipant): GridPoint[] =>
    holder.battleData.position ? [holder.battleData.position] : [];

/** Any of the spell's landing cells (reactive) or the holder's cell (persistent). Without a map or positions the range cannot be judged and the attempt is allowed */
export function isDispelRange(
    dispeller: BattleParticipant,
    at: GridPoint | readonly GridPoint[] | undefined,
    map: BattleMapConfig | null | undefined,
    rules: Ruleset
): boolean {
    const from = dispeller.battleData.position;

    const spots = at === undefined ? [] : 'x' in at ? [at] : at;

    if (!map || !from || spots.length === 0) return true;

    const feet = cellFeetOf(rules);

    const grid = gridOf(map);

    const reach = dispelRangeYards(dispeller);

    return spots.some(
        (spot) =>
            (cellDistance(from, spot, grid) * feet) / FEET_PER_YARD <= reach
    );
}
