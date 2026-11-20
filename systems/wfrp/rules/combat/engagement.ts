import { outnumberWeight } from '../traits/size';
import { SURROUNDED_FOES } from './constants';

import { isActive } from '@/lib/utils/abilities/engine/core/participants';
import { isAdjacentOnMap } from '@/lib/utils/battle/grid/adjacency';
import { isHostile } from '@/lib/utils/battle/modes/engine';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

type MapCfg = BattleMapConfig | null | undefined;

const sum = (
    ps: BattleParticipant[],
    weight: (p: BattleParticipant) => number
) => ps.reduce((n, p) => n + weight(p), 0);

// Positions are required: without a map nobody counts as outnumbering. `weighted` (canon size): bigger fighters count for more, capped at the target's weight (p166, p360).
export function isOutnumbering(
    attacker: BattleParticipant,
    target: BattleParticipant,
    participants: BattleParticipant[],
    map: MapCfg,
    weighted = false
): boolean {
    if (
        !isHostile(map, attacker, target) ||
        !isAdjacentOnMap(map, attacker, target)
    )
        return false;

    const attackers = engagedFoes(target, participants, map);

    const defenders = engagedFoes(attacker, participants, map);

    if (!weighted) return attackers.length >= 2 * defenders.length;

    const cap = outnumberWeight(target);

    return (
        sum(attackers, (a) => Math.min(outnumberWeight(a), cap)) >=
        2 * sum(defenders, outnumberWeight)
    );
}

export const engagedFoes = (
    p: BattleParticipant,
    participants: BattleParticipant[],
    map: MapCfg
): BattleParticipant[] =>
    participants.filter(
        (f) => isHostile(map, f, p) && isActive(f) && isAdjacentOnMap(map, f, p)
    );

export const isSurrounded = (foes: BattleParticipant[]): boolean =>
    foes.length >= SURROUNDED_FOES;

export const isOutnumbered = (
    p: BattleParticipant,
    foes: BattleParticipant[],
    participants: BattleParticipant[],
    map: MapCfg,
    weighted = false
): boolean =>
    foes.some((f) => isOutnumbering(f, p, participants, map, weighted));
