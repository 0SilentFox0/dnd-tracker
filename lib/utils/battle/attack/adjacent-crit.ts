import { collectModifiers } from '@/lib/utils/abilities/engine/core/collect-modifiers';
import type { StaticEffect } from '@/lib/utils/abilities/schema';
import { isAdjacentAttack } from '@/lib/utils/battle/grid/adjacent-attack';
import type { BattleAttack, BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

export function autoCritsAdjacent(input: {
    participants: BattleParticipant[];
    attacker: BattleParticipant;
    target: BattleParticipant;
    attack: BattleAttack;
    map?: BattleMapConfig | null;
    targetExtra?: StaticEffect[];
}): boolean {
    const { participants, attacker, target, attack, map, targetExtra } = input;

    return (
        collectModifiers(
            participants,
            target.basicInfo.id,
            { flag: 'autoCritAdjacent' },
            targetExtra
        ).entries.length > 0 && isAdjacentAttack(attacker, target, attack, map)
    );
}
