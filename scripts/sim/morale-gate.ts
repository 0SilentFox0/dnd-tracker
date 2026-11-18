import type { Ruleset } from '@/lib/utils/rules';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { ActGateScope } from '@/lib/utils/rules/systems/types';
import type { BattleParticipant } from '@/types/battle';

export const awaitsMoraleCheck = (
    scope: Omit<ActGateScope, 'rules'>,
    participantId: string,
    rules: Ruleset = DEFAULT_RULES
): boolean =>
    !!ruleSystemOf(rules).combat.turn?.startCheck?.due(
        { ...scope, rules },
        participantId
    );

export const effectiveMorale = (
    p: BattleParticipant,
    participants: BattleParticipant[],
    rules: Ruleset = DEFAULT_RULES
): { value: number } => ({
    value:
        ruleSystemOf(rules).combat.turn?.startCheck?.valueOf(p, participants) ??
        0,
});
