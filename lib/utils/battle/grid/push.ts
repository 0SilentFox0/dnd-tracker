import { gridOf } from './geometry';
import { hexAwayStep } from './hex';
import { canStand } from './occupancy';

import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig, GridKind, GridPoint } from '@/types/battle-grid';

export const awayStep = (
    from: GridPoint,
    at: GridPoint,
    grid: GridKind
): GridPoint =>
    grid === 'hex'
        ? hexAwayStep(from, at)
        : {
              x: at.x + Math.sign(at.x - from.x),
              y: at.y + Math.sign(at.y - from.y),
          };

export function pushAway(
    map: BattleMapConfig,
    participants: BattleParticipant[],
    from: GridPoint,
    target: BattleParticipant,
    cells: number
): { position: GridPoint; steps: number } {
    const grid = gridOf(map);

    let position = target.battleData.position as GridPoint;

    let steps = 0;

    while (steps < cells) {
        const next = awayStep(from, position, grid);

        if (next.x === position.x && next.y === position.y) break;

        if (!canStand(map, participants, target, next)) break;

        position = next;
        steps += 1;
    }

    return { position, steps };
}
