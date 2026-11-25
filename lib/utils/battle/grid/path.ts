import { cellFeetOf } from './cell-feet';
import {
    edgeBlocks,
    ignoresDifficultTerrain,
    passesWalls,
    wallsOf,
} from './edges';
import {
    cellKey,
    difficultSet,
    footprint,
    footprintDistance,
    gridOf,
    neighbors,
} from './geometry';
import { hexCenter } from './hex';
import { cellCenter } from './layout';
import {
    cellsOf,
    fits,
    footprintSizeOf,
    isOnMap,
    occupiedBy,
} from './occupancy';

import { EffectMarker } from '@/lib/constants/battle';
import { statWithModifiers } from '@/lib/utils/abilities/engine/core/collect-modifiers';
import { isActive } from '@/lib/utils/abilities/engine/core/participants';
import { conditionSourceIds } from '@/lib/utils/battle/conditions/query';
import { hasEffectMarker } from '@/lib/utils/battle/participant/state';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig, GridPoint } from '@/types/battle-grid';

export function baseMovement(p: BattleParticipant, rules: Ruleset): number {
    if (hasEffectMarker(p, EffectMarker.IMMOBILIZED)) return 0;

    return Math.max(
        0,
        Math.floor(
            statWithModifiers(
                [p],
                p.basicInfo.id,
                'speed',
                p.combatStats.speed
            ) / cellFeetOf(rules)
        )
    );
}

export function movementBudget(p: BattleParticipant, rules: Ruleset): number {
    return baseMovement(p, rules) + (p.battleData.extraMovement ?? 0);
}

export function remainingMovement(
    p: BattleParticipant,
    rules: Ruleset
): number {
    return Math.max(
        0,
        movementBudget(p, rules) - (p.battleData.movementUsed ?? 0)
    );
}

export interface PathSearch {
    cost: Map<string, number>;
    parent: Map<string, GridPoint>;
    preds?: Map<string, GridPoint[]>;
}

export function reachable(
    map: BattleMapConfig,
    participants: BattleParticipant[],
    mover: BattleParticipant,
    budget: number,
    opts: { avoid?: ReadonlySet<string> } = {}
): Map<string, number> {
    return searchPaths(map, participants, mover, budget, opts).cost;
}

interface Route {
    through: number;
    deviation: number;
    prev: GridPoint | null;
}

// Hex steps are all the same length, so among the equal-cost routes (the `preds` DAG) pick the one
// that passes through the fewest occupied cells, then stays closest to the straight segment.
function straightestHexPath(
    { cost, preds }: Required<PathSearch>,
    start: GridPoint,
    to: GridPoint
): GridPoint[] {
    const a = hexCenter(start);

    const b = hexCenter(to);

    const dx = b.x - a.x;

    const dy = b.y - a.y;

    const span = Math.hypot(dx, dy) || 1;

    const offLine = (c: GridPoint) => {
        const p = hexCenter(c);

        return Math.abs(dx * (a.y - p.y) - (a.x - p.x) * dy) / span;
    };

    const startKey = cellKey(start);

    const memo = new Map<string, Route>([
        [startKey, { through: 0, deviation: 0, prev: null }],
    ]);

    const best = (cell: GridPoint): Route => {
        const key = cellKey(cell);

        const known = memo.get(key);

        if (known) return known;

        const own = cost.has(key) ? 0 : 1;

        const d = offLine(cell);

        let route: Route | null = null;

        for (const p of preds.get(key) ?? []) {
            const sub = best(p);

            const through = sub.through + own;

            const deviation = Math.max(sub.deviation, d);

            if (
                !route ||
                through < route.through ||
                (through === route.through &&
                    deviation < route.deviation - 1e-6)
            )
                route = { through, deviation, prev: p };
        }

        const result = route ?? { through: 0, deviation: d, prev: null };

        memo.set(key, result);

        return result;
    };

    best(to);

    const path: GridPoint[] = [];

    for (
        let cur: GridPoint | null = to;
        cur && cellKey(cur) !== startKey;
        cur = memo.get(cellKey(cur))?.prev ?? null
    )
        path.unshift(cur);

    return path;
}

export function pathFrom(
    search: PathSearch,
    mover: BattleParticipant,
    to: GridPoint
): GridPoint[] | null {
    const { cost, parent, preds } = search;

    const start = mover.battleData.position;

    if (!start || !cost.has(cellKey(to))) return null;

    if (preds) return straightestHexPath({ cost, parent, preds }, start, to);

    const path: GridPoint[] = [];

    for (
        let cur: GridPoint | undefined = to;
        cur && cellKey(cur) !== cellKey(start);
        cur = parent.get(cellKey(cur))
    )
        path.unshift(cur);

    return path;
}

export const pathTo = (
    map: BattleMapConfig,
    participants: BattleParticipant[],
    mover: BattleParticipant,
    to: GridPoint,
    budget: number
) => pathFrom(searchPaths(map, participants, mover, budget), mover, to);

export function searchPaths(
    map: BattleMapConfig,
    participants: BattleParticipant[],
    mover: BattleParticipant,
    budget: number,
    opts: { avoid?: ReadonlySet<string> } = {}
): PathSearch {
    const start = mover.battleData.position;

    const result = new Map<string, number>();

    const parent = new Map<string, GridPoint>();

    if (!start) return { cost: result, parent };

    const grid = gridOf(map);

    const preds = grid === 'hex' ? new Map<string, GridPoint[]>() : undefined;

    const size = footprintSizeOf(mover, grid);

    const notMe = (p: BattleParticipant) =>
        p.basicInfo.id !== mover.basicInfo.id;

    const walls = occupiedBy(
        participants,
        (p) => notMe(p) && p.basicInfo.side !== mover.basicInfo.side,
        grid
    );

    const taken = occupiedBy(participants, notMe, grid);

    const { avoid } = opts;

    const touchesAvoid = (anchor: GridPoint) =>
        !!avoid?.size &&
        footprint(anchor, size, grid).some((c) => avoid.has(cellKey(c)));

    const hasEdges =
        (wallsOf(map).size > 0 || !!map.bars?.length) && !passesWalls(mover);

    const stepBlocked = (cur: GridPoint, next: GridPoint) => {
        if (!hasEdges) return false;

        const to = footprint(next, size, grid);

        return footprint(cur, size, grid).some((c, i) =>
            edgeBlocks(map, c, to[i], 'move')
        );
    };

    const difficult = ignoresDifficultTerrain(mover)
        ? new Set<string>()
        : difficultSet(map);

    const stepCost = (anchor: GridPoint) =>
        difficult.size > 0 &&
        footprint(anchor, size, grid).some((c) => difficult.has(cellKey(c)))
            ? 2
            : 1;

    const seen = new Map([[cellKey(start), 0]]);

    // Among equal-cost routes prefer fewer occupied cells passed through, then the straightest.
    const length = new Map([[cellKey(start), 0]]);

    const through = new Map([[cellKey(start), 0]]);

    const buckets: GridPoint[][] = [[start]];

    for (let cost = 0; cost < buckets.length && cost < budget; cost++) {
        for (const cur of buckets[cost] ?? []) {
            const curKey = cellKey(cur);

            if (seen.get(curKey) !== cost) continue;

            const from = cellCenter(cur, grid);

            for (const next of neighbors(cur, grid)) {
                const key = cellKey(next);

                const nextCost = cost + stepCost(next);

                const known = seen.get(key);

                if (nextCost > budget || (known ?? Infinity) < nextCost)
                    continue;

                const to = cellCenter(next, grid);

                const nextLength =
                    (length.get(curKey) ?? 0) +
                    Math.hypot(to.x - from.x, to.y - from.y);

                const nextThrough =
                    (through.get(curKey) ?? 0) +
                    (fits(map, next, size, taken) ? 0 : 1);

                const knownThrough = through.get(key) ?? Infinity;

                if (
                    stepBlocked(cur, next) ||
                    !fits(map, next, size, walls) ||
                    touchesAvoid(next)
                )
                    continue;

                if (known === nextCost) preds?.get(key)?.push(cur);

                if (
                    known === nextCost &&
                    (nextThrough > knownThrough ||
                        (nextThrough === knownThrough &&
                            nextLength >= (length.get(key) ?? Infinity) - 1e-6))
                )
                    continue;

                seen.set(key, nextCost);
                length.set(key, nextLength);
                through.set(key, nextThrough);
                parent.set(key, cur);

                if (known !== nextCost) preds?.set(key, [cur]);

                if (known === undefined) (buckets[nextCost] ??= []).push(next);

                if (fits(map, next, size, taken)) result.set(key, nextCost);
                else result.delete(key);
            }
        }
    }

    return { cost: result, parent, preds };
}

export function moveBudget(
    {
        rules,
    }: { map: BattleMapConfig; dmUserId: string | null; rules: Ruleset },
    p: BattleParticipant
): number {
    return remainingMovement(p, rules);
}

export function frightenedBlocksMove(
    map: BattleMapConfig | null | undefined,
    participants: BattleParticipant[],
    mover: BattleParticipant,
    to: GridPoint
): boolean {
    if (!map) return false;

    const sources = conditionSourceIds(mover, 'frightened', participants);

    if (!sources.length) return false;

    const grid = gridOf(map);

    const destination = footprint(to, footprintSizeOf(mover, grid), grid);

    return participants.some(
        (p) =>
            sources.includes(p.basicInfo.id) &&
            isActive(p) &&
            isOnMap(p) &&
            footprintDistance(destination, cellsOf(p, grid), grid) <
                footprintDistance(cellsOf(mover, grid), cellsOf(p, grid), grid)
    );
}
