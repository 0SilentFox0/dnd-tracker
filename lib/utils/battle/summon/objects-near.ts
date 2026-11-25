import { isActive } from '@/lib/utils/abilities/engine/core/participants';
import { cellsOf, footprintDistance } from '@/lib/utils/battle/grid';
import { cellFeetOf } from '@/lib/utils/battle/grid/cell-feet';
import { isOnMap } from '@/lib/utils/battle/grid/occupancy';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { BattleParticipant } from '@/types/battle';

export function objectsNear(
    ps: BattleParticipant[],
    ownerId: string,
    spellId: string,
    target: BattleParticipant,
    feet: number,
    rules: Ruleset
): BattleParticipant[] {
    if (!isOnMap(target)) return [];

    return ps.filter(
        (p) =>
            p.battleData.object?.spellId === spellId &&
            p.battleData.summonedBy === ownerId &&
            isActive(p) &&
            isOnMap(p) &&
            footprintDistance(cellsOf(p, 'square'), cellsOf(target, 'square')) *
                cellFeetOf(rules) <=
                feet
    );
}
