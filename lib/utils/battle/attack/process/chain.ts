import {
    isDormant,
    isTargetable,
} from '@/lib/utils/abilities/engine/core/participants';
import {
    attackRangeCells,
    cellsConnected,
    cellsOf,
    footprintDistance,
    isOnMap,
    nearestTo,
    wallsAllowSight,
} from '@/lib/utils/battle/grid';
import { gridOf } from '@/lib/utils/battle/grid/geometry';
import { isHostile, modeSees } from '@/lib/utils/battle/modes/engine';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { BattleAttack, BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

export interface ChainStep {
    map: BattleMapConfig | null | undefined;
    order: BattleParticipant[];
    attacker: BattleParticipant;
    attack: BattleAttack;
    from: BattleParticipant;
    hit: ReadonlySet<string>;
    rules: Ruleset;
}

export function nextChainTarget({
    map,
    order,
    attacker,
    attack,
    from,
    hit,
    rules,
}: ChainStep): BattleParticipant | undefined {
    const range = attackRangeCells(attack.range, rules);

    const grid = gridOf(map);

    const origin = cellsOf(from, grid);

    const inRange = (p: BattleParticipant) =>
        !map ||
        range === null ||
        origin.length === 0 ||
        !isOnMap(p) ||
        footprintDistance(origin, cellsOf(p, grid), grid) <= range;

    const candidates = order.filter(
        (p) =>
            isHostile(map, attacker, p) &&
            !hit.has(p.basicInfo.id) &&
            isTargetable(p) &&
            !isDormant(p) &&
            modeSees(map, attacker, p) &&
            wallsAllowSight(map, attacker, p) &&
            (!map ||
                !isOnMap(p) ||
                origin.length === 0 ||
                cellsConnected(map, 'fire', origin, cellsOf(p, grid))) &&
            inRange(p)
    );

    return map ? nearestTo(from, candidates, grid) : candidates[0];
}
