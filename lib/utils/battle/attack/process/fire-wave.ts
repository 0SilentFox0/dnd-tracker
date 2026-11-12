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
import { isHostile } from '@/lib/utils/battle/modes/engine';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { BattleMapConfig, BattleParticipant } from '@/types/battle';

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

    const from = cellsOf(attacker);

    const vc = closestCell(cellsOf(victim), from);

    const ac = apexOf(from, vc);

    const aim = {
        x: vc.x + Math.sign(vc.x - ac.x),
        y: vc.y + Math.sign(vc.y - ac.y),
    };

    const cells = templateCells(
        map,
        { shape: 'cone', size: sizeFt },
        cellsOf(victim),
        aim,
        rules
    );

    return participantsInCells(ps, cells, apexOf(cellsOf(victim), aim))
        .filter(isEnemy)
        .map((p) => p.basicInfo.id);
}
