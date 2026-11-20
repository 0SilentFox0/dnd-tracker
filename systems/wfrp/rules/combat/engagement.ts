import { EDITION_PROFILES, type EditionProfile } from '../edition';
import { outnumberWeight } from '../traits/size';
import { SURROUNDED_FOES } from './constants';

import { isActive } from '@/lib/utils/abilities/engine/core/participants';
import { isAdjacentOnMap } from '@/lib/utils/battle/grid/adjacency';
import { isHostile } from '@/lib/utils/battle/modes/engine';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

type MapCfg = BattleMapConfig | null | undefined;

// Positions are required: without a map nobody counts as outnumbering. Both sides are weighed by size (p360).
export function isOutnumbering(
    attacker: BattleParticipant,
    target: BattleParticipant,
    participants: BattleParticipant[],
    map: MapCfg,
    edition: Pick<EditionProfile, 'combatModsModel'> = EDITION_PROFILES.legacy
): boolean {
    if (
        !isHostile(map, attacker, target) ||
        !isAdjacentOnMap(map, attacker, target)
    )
        return false;

    const defenders = engagedFoes(attacker, participants, map).map((p) =>
        outnumberWeight(p, edition)
    );

    // A larger creature counts as several only against opponents that are as big (p360: two ogres vs a human are 2:1, four Large vs a Monstrous 2:1)
    const cap = Math.max(1, ...defenders);

    const attackers = engagedFoes(target, participants, map).reduce(
        (sum, p) => sum + Math.min(outnumberWeight(p, edition), cap),
        0
    );

    return attackers >= 2 * defenders.reduce((sum, w) => sum + w, 0);
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
