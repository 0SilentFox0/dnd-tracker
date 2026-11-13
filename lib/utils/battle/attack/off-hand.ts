import { spendFromPool } from './attacks-left';

import type { Ruleset } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

export const canOffHandAttack = (
    p: BattleParticipant,
    rules: Ruleset
): boolean => !!ruleSystemOf(rules).combat.offHand?.ready(p);

/** Атака дією «Атака». */
export function spendAttack(
    p: BattleParticipant,
    participants: BattleParticipant[],
    attack: BattleAttack,
    rules: Ruleset
): BattleParticipant {
    const next = spendFromPool(p, participants);

    return ruleSystemOf(rules).combat.offHand?.arm(next, attack) ?? next;
}
