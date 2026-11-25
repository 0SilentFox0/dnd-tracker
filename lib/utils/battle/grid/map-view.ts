import { pickAttack } from './attack-reach';
import { cellKey, footprint, parseCellKey } from './geometry';
import { cellsOf, isOnMap, sizeOf } from './occupancy';
import { moveBudget, type PathSearch, searchPaths } from './path';
import { hazardCells, threatCells } from './terrain';

import { isAttackable } from '@/lib/utils/abilities/engine/core/participants';
import { isHostile } from '@/lib/utils/battle/modes/engine';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { BattleAttack, BattleParticipant } from '@/types/battle';
import type {
    BattleMapConfig,
    BattleMapMark,
    GridPoint,
} from '@/types/battle-grid';

export type CellMark = BattleMapMark;

export function moveSearch(
    map: BattleMapConfig,
    participants: BattleParticipant[],
    mover: BattleParticipant,
    opts: { rules: Ruleset; dmUserId?: string | null }
): PathSearch {
    return searchPaths(
        map,
        participants,
        mover,
        moveBudget(
            { map, dmUserId: opts.dmUserId ?? null, rules: opts.rules },
            mover
        )
    );
}

export function moveMarks(
    map: BattleMapConfig,
    participants: BattleParticipant[],
    mover: BattleParticipant,
    opts: { rules: Ruleset; dmUserId?: string | null }
): Map<string, number> {
    return moveSearch(map, participants, mover, opts).cost;
}

export const isMoveMark = (m: CellMark | number | undefined): boolean =>
    typeof m === 'number' || m === 'move' || m === 'move-danger';

export interface MoveStep {
    anchor: GridPoint;
    cost: number;
}

function closerStep(a: MoveStep, b: MoveStep, from: GridPoint): boolean {
    if (a.cost !== b.cost) return a.cost < b.cost;

    const d = (s: MoveStep) => [
        Math.max(Math.abs(s.anchor.x - from.x), Math.abs(s.anchor.y - from.y)),
        Math.abs(s.anchor.x - from.x) + Math.abs(s.anchor.y - from.y),
        s.anchor.y,
        s.anchor.x,
    ];

    const [da, db] = [d(a), d(b)];

    const i = da.findIndex((v, k) => v !== db[k]);

    return i !== -1 && da[i] < db[i];
}

export function moveSteps(
    map: BattleMapConfig,
    participants: BattleParticipant[],
    mover: BattleParticipant,
    opts: { rules: Ruleset; dmUserId?: string | null }
): Map<string, MoveStep> {
    return moveReach(map, participants, mover, opts).steps;
}

export function moveReach(
    map: BattleMapConfig,
    participants: BattleParticipant[],
    mover: BattleParticipant,
    opts: { rules: Ruleset; dmUserId?: string | null }
): { steps: Map<string, MoveStep>; search: PathSearch } {
    const search = moveSearch(map, participants, mover, opts);

    return { steps: stepsOf(search.cost, mover), search };
}

function stepsOf(
    anchors: Map<string, number>,
    mover: BattleParticipant
): Map<string, MoveStep> {
    const size = sizeOf(mover);

    const from = mover.battleData.position;

    const steps = new Map<string, MoveStep>();

    if (size === 1 || !from) {
        for (const [key, cost] of anchors)
            steps.set(key, { anchor: parseCellKey(key), cost });

        return steps;
    }

    const own = new Set(cellsOf(mover).map(cellKey));

    for (const [key, cost] of anchors) {
        const step = { anchor: parseCellKey(key), cost };

        for (const cell of footprint(step.anchor, size)) {
            const k = cellKey(cell);

            const kept = steps.get(k);

            if (!own.has(k) && (!kept || closerStep(step, kept, from)))
                steps.set(k, step);
        }
    }

    return steps;
}

export function moveZoneMarks(
    map: BattleMapConfig,
    participants: BattleParticipant[],
    mover: BattleParticipant,
    opts: {
        rules: Ruleset;
        dmUserId?: string | null;
        steps?: Map<string, MoveStep>;
    }
): Map<string, CellMark | number> {
    const danger = new Set([
        ...threatCells(map, participants, mover),
        ...hazardCells(map),
    ]);

    const marks = new Map<string, CellMark | number>();

    for (const [key, { cost }] of opts.steps ??
        moveSteps(map, participants, mover, opts))
        marks.set(key, danger.has(key) ? 'move-danger' : cost);

    return marks;
}

export function targetMarks(
    map: BattleMapConfig,
    participants: BattleParticipant[],
    attacker: BattleParticipant,
    attacks: BattleAttack[],
    rules: Ruleset
): Map<string, CellMark> {
    const marks = new Map<string, CellMark>();

    for (const t of participants) {
        if (!isHostile(map, attacker, t) || !isOnMap(t) || !isAttackable(t))
            continue;

        const mark: CellMark = pickAttack(
            map,
            participants,
            attacker,
            attacks,
            t,
            rules
        ).attack
            ? 'target'
            : 'invalid-target';

        for (const c of cellsOf(t)) marks.set(cellKey(c), mark);
    }

    return marks;
}
