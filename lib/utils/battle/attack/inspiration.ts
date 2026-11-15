import { textRef } from '@/lib/i18n/text-ref';
import type { Ruleset } from '@/lib/utils/rules';
import { inspirationOn } from '@/lib/utils/rules/inspiration-on';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { BattleParticipant } from '@/types/battle';

export const INSPIRATION_LABEL = textRef('battleLog.rollMode.inspiration');

export function canUseInspiration(
    p: BattleParticipant | undefined | null,
    rules: Ruleset | undefined | null
): boolean {
    return (
        !!p &&
        !!rules &&
        inspirationOn(rules) &&
        !!ruleSystemOf(rules).combat.inspiration?.available(p)
    );
}

export function spendInspiration(
    ps: BattleParticipant[],
    id: string,
    rules: Ruleset
): BattleParticipant[] {
    const hook = ruleSystemOf(rules).combat.inspiration;

    return hook
        ? ps.map((p) => (p.basicInfo.id === id ? hook.spend(p) : p))
        : ps;
}
