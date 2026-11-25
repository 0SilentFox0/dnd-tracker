import { FIRE_WAVE_NO_MAP_VICTIMS } from '@/lib/constants/battle';
import {
    findParticipant,
    isTargetable,
} from '@/lib/utils/abilities/engine/core/participants';
import {
    apexOf,
    bothOnMap,
    cellsOf,
    closestCell,
    participantsInCells,
    templateCells,
} from '@/lib/utils/battle/grid';
import { gridOf } from '@/lib/utils/battle/grid/geometry';
import { hexAwayStep } from '@/lib/utils/battle/grid/hex';
import { isHostile } from '@/lib/utils/battle/modes/engine';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

export function fireWaveVictims(
    map: BattleMapConfig | null | undefined,
    ps: BattleParticipant[],
    attacker: BattleParticipant,
    victimId: string,
    sizeFt: number,
    rules: Ruleset
): string[] {
    const victim = findParticipant(ps, victimId);

    if (!victim) return [];

    const isEnemy = (p: BattleParticipant) =>
        isHostile(map, attacker, p) &&
        p.basicInfo.id !== victimId &&
        isTargetable(p);

    if (!bothOnMap(map, attacker, victim))
        return ps
            .filter(isEnemy)
            .slice(0, FIRE_WAVE_NO_MAP_VICTIMS)
            .map((p) => p.basicInfo.id);

    const grid = gridOf(map);

    const from = cellsOf(attacker, grid);

    const victimCells = cellsOf(victim, grid);

    const vc = closestCell(victimCells, from, grid);

    const ac = apexOf(from, vc, grid);

    const aim =
        grid === 'hex'
            ? hexAwayStep(ac, vc)
            : {
                  x: vc.x + Math.sign(vc.x - ac.x),
                  y: vc.y + Math.sign(vc.y - ac.y),
              };

    const cells = templateCells(
        map,
        { shape: 'cone', size: sizeFt },
        victimCells,
        aim,
        rules
    );

    return participantsInCells(ps, cells, apexOf(victimCells, aim, grid), grid)
        .filter(isEnemy)
        .map((p) => p.basicInfo.id);
}
