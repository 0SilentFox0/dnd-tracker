import { collectModifiers } from '@/lib/utils/abilities/engine/core/collect-modifiers';
import { withSelf } from '@/lib/utils/abilities/engine/core/participants';
import type { Ruleset } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { BattleParticipant } from '@/types/battle';

export type InitiativeRules = Pick<Ruleset, 'initiative' | 'system'>;

export interface InitiativeRoll {
    rules: InitiativeRules;
    rng?: () => number;
    /** Roll regardless of the static/roll mode of the initiative section */
    roll?: boolean;
}

export interface InitiativeResult {
    total: number;
    roll: number | null;
    die: number | null;
}

/** Roll mode: the system's roll (d20 + DEX for d20 systems); pinned (always-first) bases stay static. */
export function scoreInitiative(
    participant: BattleParticipant,
    participants: BattleParticipant[] = [participant],
    roll: InitiativeRoll
): InitiativeResult {
    const bonus = collectModifiers(
        withSelf(participants, participant),
        participant.basicInfo.id,
        { stat: 'initiative' }
    ).flat;

    const { rules } = roll;

    const score = ruleSystemOf(rules).combat.initiative(participant, {
        rules,
        rng: roll.rng ?? Math.random,
        roll: roll.roll,
    });

    return { ...score, total: score.total + bonus };
}

export const calculateInitiative = (
    participant: BattleParticipant,
    participants: BattleParticipant[] = [participant],
    roll: InitiativeRoll
): number => scoreInitiative(participant, participants, roll).total;

export function compareInitiative(
    a: BattleParticipant,
    b: BattleParticipant,
    rules: InitiativeRules
): number {
    if (b.abilities.initiative !== a.abilities.initiative)
        return b.abilities.initiative - a.abilities.initiative;

    if (b.abilities.baseInitiative !== a.abilities.baseInitiative)
        return b.abilities.baseInitiative - a.abilities.baseInitiative;

    const { tieBreak } = ruleSystemOf(rules).combat;

    return tieBreak(b) - tieBreak(a);
}

/** Index at which `p` fits into `order` (first slot it outranks at or after `from`), or `order.length`. */
export function initiativeSlot(
    order: BattleParticipant[],
    p: BattleParticipant,
    rules: InitiativeRules,
    from = 0
): number {
    const at = order.findIndex(
        (other, i) => i >= from && compareInitiative(p, other, rules) < 0
    );

    return at === -1 ? order.length : at;
}

/** Порядок: initiative (desc) → baseInitiative (desc) → dexterity / system tie-break stat (desc). */
export function sortByInitiative(
    participants: BattleParticipant[],
    rules: InitiativeRules
): BattleParticipant[] {
    return [...participants].sort((a, b) => compareInitiative(a, b, rules));
}
