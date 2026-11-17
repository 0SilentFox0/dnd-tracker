import { textRef } from '@/lib/i18n/text-ref';
import { cellsAdjacentOnMap } from '@/lib/utils/battle/grid/adjacency';
import {
    cellsByRing,
    footprint,
    footprintDistance,
} from '@/lib/utils/battle/grid/geometry';
import {
    cellsOf,
    fits,
    isOnMap,
    occupiedBy,
    sizeOf,
} from '@/lib/utils/battle/grid/occupancy';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig, GridPoint } from '@/types/battle-grid';
import type { LogLine } from '@/types/text';

/** Найближча до кастера вільна клітинка впритул до цілі; null — місця немає. */
export function adjacentFreeCell(
    map: BattleMapConfig,
    participants: BattleParticipant[],
    mover: BattleParticipant,
    target: BattleParticipant
): GridPoint | null {
    const targetAnchor = target.battleData.position;

    const from = mover.battleData.position;

    if (!targetAnchor || !from) return null;

    const size = sizeOf(mover);

    const blocked = occupiedBy(
        participants,
        (p) => p.basicInfo.id !== mover.basicInfo.id
    );

    const targetCells = cellsOf(target);

    const near: GridPoint[] = [];

    const reach = size + sizeOf(target);

    for (const a of cellsByRing(map, targetAnchor)) {
        if (
            Math.max(
                Math.abs(a.x - targetAnchor.x),
                Math.abs(a.y - targetAnchor.y)
            ) > reach
        )
            break;

        if (
            fits(map, a, size, blocked) &&
            cellsAdjacentOnMap(map, footprint(a, size), targetCells)
        )
            near.push(a);
    }

    const away = (a: GridPoint) =>
        footprintDistance([a], [from]) * 1000 +
        (a.x - from.x) ** 2 +
        (a.y - from.y) ** 2;

    return near.reduce<GridPoint | null>(
        (best, a) => (!best || away(a) < away(best) ? a : best),
        null
    );
}

export function moveAdjacent(
    map: BattleMapConfig | null | undefined,
    participants: BattleParticipant[],
    moverId: string,
    targetId: string
): { participants: BattleParticipant[]; message: LogLine } {
    const mover = participants.find((p) => p.basicInfo.id === moverId);

    const target = participants.find((p) => p.basicInfo.id === targetId);

    if (!mover || !target) return { participants, message: '' };

    if (!map || !isOnMap(mover) || !isOnMap(target))
        return {
            participants,
            message: textRef('battleLog.spellFx.moveSelfNoMap', {
                mover: mover.basicInfo.name,
                target: target.basicInfo.name,
            }),
        };

    const cell = adjacentFreeCell(map, participants, mover, target);

    if (!cell)
        return {
            participants,
            message: textRef('battleLog.spellFx.moveSelfNoCell', {
                mover: mover.basicInfo.name,
                target: target.basicInfo.name,
            }),
        };

    const moved = {
        ...mover,
        battleData: { ...mover.battleData, position: cell },
    };

    return {
        participants: participants.map((p) => (p === mover ? moved : p)),
        message: textRef('battleLog.spellFx.moveSelf', {
            mover: mover.basicInfo.name,
            target: target.basicInfo.name,
        }),
    };
}
