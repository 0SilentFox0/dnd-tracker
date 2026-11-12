import { collectModifiers } from '@/lib/utils/abilities/engine/core/collect-modifiers';
import { withSelf } from '@/lib/utils/abilities/engine/core/participants';
import { DEFAULT_RULES } from '@/lib/utils/rules/defaults';
import type { Ruleset } from '@/lib/utils/rules/schema';
import { ruleSystemByKey, ruleSystemOf } from '@/lib/utils/rules/systems';
import { BattleParticipant } from '@/types/battle';

export interface InitiativeRoll {
    rules?: Pick<Ruleset, 'initiative'> & Partial<Pick<Ruleset, 'system'>>;
    rng?: () => number;
}

export interface InitiativeResult {
    total: number;
    roll: number | null;
    die: number | null;
}

/** `rules.initiative.mode: "roll"` — the system's roll (d20 + DEX for d20 systems); pinned (always-first) bases stay static. */
export function scoreInitiative(
    participant: BattleParticipant,
    participants: BattleParticipant[] = [participant],
    roll: InitiativeRoll = {}
): InitiativeResult {
    const bonus = collectModifiers(
        withSelf(participants, participant),
        participant.basicInfo.id,
        { stat: 'initiative' }
    ).flat;

    const { rules } = roll;

    const score = ruleSystemOf({
        system: rules?.system ?? DEFAULT_RULES.system,
    }).combat.initiative(participant, {
        rules: rules ?? DEFAULT_RULES,
        rng: roll.rng ?? Math.random,
    });

    return { ...score, total: score.total + bonus };
}

export const calculateInitiative = (
    participant: BattleParticipant,
    participants: BattleParticipant[] = [participant],
    roll: InitiativeRoll = {}
): number => scoreInitiative(participant, participants, roll).total;

const tieBreakStat = (p: BattleParticipant) =>
    (
        ruleSystemByKey(p.abilities.system?.key ?? DEFAULT_RULES.system.key) ??
        ruleSystemOf(DEFAULT_RULES)
    ).combat.tieBreak(p);

export function compareInitiative(
    a: BattleParticipant,
    b: BattleParticipant
): number {
    if (b.abilities.initiative !== a.abilities.initiative)
        return b.abilities.initiative - a.abilities.initiative;

    if (b.abilities.baseInitiative !== a.abilities.baseInitiative)
        return b.abilities.baseInitiative - a.abilities.baseInitiative;

    return tieBreakStat(b) - tieBreakStat(a);
}

/** Index at which `p` fits into `order` (first slot it outranks at or after `from`), or `order.length`. */
export function initiativeSlot(
    order: BattleParticipant[],
    p: BattleParticipant,
    from = 0
): number {
    const at = order.findIndex(
        (other, i) => i >= from && compareInitiative(p, other) < 0
    );

    return at === -1 ? order.length : at;
}

/** Порядок: initiative (desc) → baseInitiative (desc) → dexterity / system tie-break stat (desc). */
export function sortByInitiative(
    participants: BattleParticipant[]
): BattleParticipant[] {
    return [...participants].sort(compareInitiative);
}
