import { textRef } from '@/lib/i18n/text-ref';
import { cellsAdjacentOnMap } from '@/lib/utils/battle/grid/adjacency';
import { gridOf } from '@/lib/utils/battle/grid/geometry';
import {
    cellDistance,
    cellsByRing,
    footprint,
    footprintDistance,
} from '@/lib/utils/battle/grid/geometry';
import { footprintSizeOf } from '@/lib/utils/battle/grid/occupancy';
import {
    cellsOf,
    fits,
    isOnMap,
    occupiedBy,
} from '@/lib/utils/battle/grid/occupancy';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig, GridPoint } from '@/types/battle-grid';
import type { LogLine } from '@/types/text';

export function adjacentFreeCell(
    map: BattleMapConfig,
    participants: BattleParticipant[],
    mover: BattleParticipant,
    target: BattleParticipant
): GridPoint | null {
    const targetAnchor = target.battleData.position;

    const from = mover.battleData.position;

    if (!targetAnchor || !from) return null;

    const grid = gridOf(map);

    const size = footprintSizeOf(mover, grid);

    const blocked = occupiedBy(
        participants,
        (p) => p.basicInfo.id !== mover.basicInfo.id,
        grid
    );

    const targetCells = cellsOf(target, grid);

    const near: GridPoint[] = [];

    const reach = size + footprintSizeOf(target, grid);

    for (const a of cellsByRing(map, targetAnchor, grid)) {
        if (cellDistance(a, targetAnchor, grid) > reach) break;

        if (
            fits(map, a, size, blocked) &&
            cellsAdjacentOnMap(map, footprint(a, size, grid), targetCells)
        )
            near.push(a);
    }

    const away = (a: GridPoint) =>
        footprintDistance([a], [from], grid) * 1000 +
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

export function teleportTo(
    map: BattleMapConfig | null | undefined,
    participants: BattleParticipant[],
    moverId: string,
    cell: GridPoint | undefined
): { participants: BattleParticipant[]; message: LogLine } {
    const mover = participants.find((p) => p.basicInfo.id === moverId);

    if (!mover) return { participants, message: '' };

    const grid = gridOf(map);

    const blocked = occupiedBy(
        participants,
        (p) => p.basicInfo.id !== moverId,
        grid
    );

    if (
        !map ||
        !cell ||
        !isOnMap(mover) ||
        !fits(map, cell, footprintSizeOf(mover, grid), blocked)
    )
        return {
            participants,
            message: textRef('battleD20.spellFx.teleportBlocked', {
                mover: mover.basicInfo.name,
            }),
        };

    return {
        participants: participants.map((p) =>
            p === mover
                ? { ...p, battleData: { ...p.battleData, position: cell } }
                : p
        ),
        message: textRef('battleD20.spellFx.teleport', {
            mover: mover.basicInfo.name,
        }),
    };
}
