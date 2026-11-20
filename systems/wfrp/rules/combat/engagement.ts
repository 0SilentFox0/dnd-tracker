import { SURROUNDED_FOES } from './constants';

import { isActive } from '@/lib/utils/abilities/engine/core/participants';
import { isAdjacentOnMap } from '@/lib/utils/battle/grid/adjacency';
import { isHostile } from '@/lib/utils/battle/modes/engine';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

type MapCfg = BattleMapConfig | null | undefined;

// Positions are required: without a map nobody counts as outnumbering.
export function isOutnumbering(
    attacker: BattleParticipant,
    target: BattleParticipant,
    participants: BattleParticipant[],
    map: MapCfg
): boolean {
    if (
        !isHostile(map, attacker, target) ||
        !isAdjacentOnMap(map, attacker, target)
    )
        return false;

    return (
        engagedFoes(target, participants, map).length >=
        2 * engagedFoes(attacker, participants, map).length
    );
}

export const engagedFoes = (
    p: BattleParticipant,
    participants: BattleParticipant[],
    map: MapCfg
): BattleParticipant[] =>
    participants.filter(
        (f) =>
            isHostile(map, f, p) &&
            isActive(f) &&
            isAdjacentOnMap(map, f, p)
    );

export const isSurrounded = (foes: BattleParticipant[]): boolean =>
    foes.length >= SURROUNDED_FOES;

export const isOutnumbered = (
    p: BattleParticipant,
    foes: BattleParticipant[],
    participants: BattleParticipant[],
    map: MapCfg
): boolean => foes.some((f) => isOutnumbering(f, p, participants, map));
