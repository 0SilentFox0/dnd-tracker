import {
    cellKey,
    cellsByRing,
    footprint,
    footprintDistance,
    gridOf,
    isPlayable,
} from './geometry';

import { CombatStatus } from '@/lib/constants/battle';
import {
    isAirborne,
    isDying,
    isEscaped,
} from '@/lib/utils/abilities/engine/core/participants';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig, GridKind, GridPoint } from '@/types/battle-grid';

export function sizeOf(p: BattleParticipant): number {
    return Math.min(4, Math.max(1, p.combatStats.gridSize ?? 1));
}

export function footprintSizeOf(p: BattleParticipant, grid: GridKind): number {
    return grid === 'hex' ? 1 : sizeOf(p);
}

export function isFallen(p: BattleParticipant): boolean {
    return p.combatStats.status !== CombatStatus.ACTIVE && !isDying(p);
}

export function occupiesCells(p: BattleParticipant): boolean {
    return (
        !p.battleData.reserved &&
        !isEscaped(p) &&
        !isAirborne(p) &&
        !isFallen(p)
    );
}

export function isOnMap(p: BattleParticipant): boolean {
    return p.battleData.position !== undefined && occupiesCells(p);
}

export function bothOnMap(
    map: BattleMapConfig | null | undefined,
    ...ps: BattleParticipant[]
): map is BattleMapConfig {
    return !!map && ps.every(isOnMap);
}

export function cellsOf(p: BattleParticipant, grid: GridKind): GridPoint[] {
    return p.battleData.position
        ? footprint(p.battleData.position, footprintSizeOf(p, grid), grid)
        : [];
}

export function isAdjacent(
    a: BattleParticipant,
    b: BattleParticipant,
    grid: GridKind
): boolean {
    return (
        isOnMap(a) &&
        isOnMap(b) &&
        footprintDistance(cellsOf(a, grid), cellsOf(b, grid), grid) <= 1
    );
}

export function occupiedBy(
    participants: BattleParticipant[],
    filter: (p: BattleParticipant) => boolean,
    grid: GridKind
): Set<string> {
    return new Set(
        participants
            .filter((p) => isOnMap(p) && filter(p))
            .flatMap((p) => cellsOf(p, grid).map(cellKey))
    );
}

export function fits(
    map: BattleMapConfig,
    anchor: GridPoint,
    size: number,
    blocked: Set<string>
): boolean {
    return footprint(anchor, size, gridOf(map)).every(
        (c) => isPlayable(map, c) && !blocked.has(cellKey(c))
    );
}

export function canStand(
    map: BattleMapConfig,
    participants: BattleParticipant[],
    mover: BattleParticipant,
    anchor: GridPoint
): boolean {
    const grid = gridOf(map);

    const others = occupiedBy(
        participants,
        (p) => p.basicInfo.id !== mover.basicInfo.id,
        grid
    );

    return fits(map, anchor, footprintSizeOf(mover, grid), others);
}

export function nearestStandable(
    map: BattleMapConfig,
    participants: BattleParticipant[],
    mover: BattleParticipant,
    from: GridPoint
): GridPoint | null {
    const grid = gridOf(map);

    const others = occupiedBy(
        participants,
        (p) => p.basicInfo.id !== mover.basicInfo.id,
        grid
    );

    const size = footprintSizeOf(mover, grid);

    for (const cell of cellsByRing(map, from, grid)) {
        if (fits(map, cell, size, others)) return cell;
    }

    return null;
}
