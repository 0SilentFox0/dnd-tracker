import { editionOf } from '../edition';
import { wfrpState, withWfrpState } from '../state';
import { outnumberWeight } from '../traits/size';
import { SURROUNDED_FOES } from './constants';

import { isActive } from '@/lib/utils/abilities/engine/core/participants';
import { isAdjacentOnMap } from '@/lib/utils/battle/grid/adjacency';
import { isHostile } from '@/lib/utils/battle/modes/engine';
import type { Ruleset } from '@/lib/utils/rules';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

type MapCfg = BattleMapConfig | null | undefined;

const sum = (
    ps: BattleParticipant[],
    weight: (p: BattleParticipant) => number
) => ps.reduce((n, p) => n + weight(p), 0);

// Positions are required: without a map nobody counts as outnumbering. `weighted` (canon size): bigger fighters count for more, capped at the heaviest defender's weight (p166, p360).
export function isOutnumbering(
    attacker: BattleParticipant,
    target: BattleParticipant,
    participants: BattleParticipant[],
    map: MapCfg,
    weighted = false,
    journal = false
): boolean {
    if (
        !isHostile(map, attacker, target) ||
        !isAdjacentOnMap(map, attacker, target)
    )
        return false;

    const attackers = foesOnAttack(
        target,
        attacker,
        participants,
        map,
        journal
    );

    const defenders = foesOnAttack(
        attacker,
        target,
        participants,
        map,
        journal
    );

    if (!weighted) return attackers.length >= 2 * defenders.length;

    const cap = Math.max(
        outnumberWeight(target),
        ...defenders.map(outnumberWeight)
    );

    return (
        sum(attackers, (a) => Math.min(outnumberWeight(a), cap)) >=
        2 * sum(defenders, outnumberWeight)
    );
}

/** Canon actions: Engaged follows the attack journal, not bare adjacency (p163) */
export const engagementJournal = (rules?: Ruleset): boolean =>
    editionOf(rules).actionsModel === 'canon';

/** An attack made in the last round or so links the pair; both sides carry the entry */
export const isEngagedPair = (
    a: BattleParticipant,
    b: BattleParticipant
): boolean =>
    wfrpState(a).engagedWith?.[b.basicInfo.id] !== undefined ||
    wfrpState(b).engagedWith?.[a.basicInfo.id] !== undefined;

export const engagedFoes = (
    p: BattleParticipant,
    participants: BattleParticipant[],
    map: MapCfg,
    journal = false
): BattleParticipant[] =>
    participants.filter(
        (f) =>
            isHostile(map, f, p) &&
            isActive(f) &&
            isAdjacentOnMap(map, f, p) &&
            (!journal || isEngagedPair(f, p))
    );

/** Engaged foes of `p`, counting the one about to attack as engaged already */
export function foesOnAttack(
    p: BattleParticipant,
    opponent: BattleParticipant,
    participants: BattleParticipant[],
    map: MapCfg,
    journal = false
): BattleParticipant[] {
    const foes = engagedFoes(p, participants, map, journal);

    return journal &&
        isHostile(map, opponent, p) &&
        isAdjacentOnMap(map, opponent, p) &&
        !foes.some((f) => f.basicInfo.id === opponent.basicInfo.id)
        ? [...foes, opponent]
        : foes;
}

/** Records a melee exchange on both fighters (aged by `ageEngagement` each round) */
export const ENGAGEMENT_FRESH = 2;

export const withEngagement = (
    p: BattleParticipant,
    otherId: string
): BattleParticipant =>
    withWfrpState(p, {
        engagedWith: {
            ...wfrpState(p).engagedWith,
            [otherId]: ENGAGEMENT_FRESH,
        },
    });

export const isSurrounded = (foes: BattleParticipant[]): boolean =>
    foes.length >= SURROUNDED_FOES;

export const isOutnumbered = (
    p: BattleParticipant,
    foes: BattleParticipant[],
    participants: BattleParticipant[],
    map: MapCfg,
    weighted = false,
    journal = false
): boolean =>
    foes.some((f) =>
        isOutnumbering(f, p, participants, map, weighted, journal)
    );
