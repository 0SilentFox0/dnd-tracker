import { spendFromPool } from './attacks-left';

import type { Ruleset } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

export const canOffHandAttack = (
    p: BattleParticipant,
    rules: Ruleset
): boolean => !!ruleSystemOf(rules).combat.secondaryAttack?.ready(p);

export function spendAttack(
    p: BattleParticipant,
    participants: BattleParticipant[],
    attack: BattleAttack,
    rules: Ruleset
): BattleParticipant {
    const next = spendFromPool(p, participants);

    return (
        ruleSystemOf(rules).combat.secondaryAttack?.arm(next, attack) ?? next
    );
}
