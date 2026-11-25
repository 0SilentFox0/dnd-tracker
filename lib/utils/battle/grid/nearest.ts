import { footprintDistance } from './geometry';
import { cellsOf, isOnMap } from './occupancy';

import type { BattleParticipant } from '@/types/battle';
import type { GridKind } from '@/types/battle-grid';

export function nearestTo(
    from: BattleParticipant,
    candidates: BattleParticipant[],
    grid: GridKind
): BattleParticipant | undefined {
    const origin = cellsOf(from, grid);

    if (origin.length === 0) return candidates[0];

    const distance = (p: BattleParticipant) =>
        isOnMap(p)
            ? footprintDistance(origin, cellsOf(p, grid), grid)
            : Infinity;

    let best: BattleParticipant | undefined;

    let bestDistance = Infinity;

    for (const p of candidates) {
        const d = distance(p);

        if (!best || d < bestDistance) {
            best = p;
            bestDistance = d;
        }
    }

    return best;
}
