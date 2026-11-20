import { SURROUNDED_FOES } from './constants';

import { isActive } from '@/lib/utils/abilities/engine/core/participants';
import { isAdjacentOnMap } from '@/lib/utils/battle/grid/adjacency';
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
    const near = (
        of: BattleParticipant,
        side: BattleParticipant['basicInfo']['side']
    ) =>
        participants.filter(
            (p) =>
                p.basicInfo.side === side &&
                isActive(p) &&
                (p.basicInfo.id === of.basicInfo.id ||
                    isAdjacentOnMap(map, p, of))
        ).length;

    if (!isAdjacentOnMap(map, attacker, target)) return false;

    return (
        near(target, attacker.basicInfo.side) >=
        2 * near(attacker, target.basicInfo.side)
    );
}

export const engagedFoes = (
    p: BattleParticipant,
    participants: BattleParticipant[],
    map: MapCfg
): BattleParticipant[] =>
    participants.filter(
        (f) =>
            f.basicInfo.side !== p.basicInfo.side &&
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
