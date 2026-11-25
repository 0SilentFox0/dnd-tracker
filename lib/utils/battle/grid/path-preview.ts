import { costToDistance } from './cell-feet';
import { cellKey } from './geometry';
import { pathFrom } from './path';

import type { Ruleset } from '@/lib/utils/rules/schema';
import type { BattleParticipant } from '@/types/battle';
import type { GridPoint, MapReach, PathPreview } from '@/types/battle-grid';

export function derivePathPreview(
    reach: MapReach | null | undefined,
    mover: BattleParticipant | null,
    hover: GridPoint | null,
    rules: Ruleset
): PathPreview | null {
    const from = mover?.battleData.position;

    if (
        !reach ||
        !mover ||
        !from ||
        !hover ||
        reach.moverId !== mover.basicInfo.id
    )
        return null;

    const target = reach.steps.get(cellKey(hover))?.anchor;

    if (!target) return null;

    const path = pathFrom(reach.search, mover, target);

    const cost = reach.search.cost.get(cellKey(target));

    return path?.length && cost !== undefined
        ? { from, path, cost, ...costToDistance(cost, rules) }
        : null;
}
