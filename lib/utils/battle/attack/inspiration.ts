import { textRef } from '@/lib/i18n/text-ref';
import type { Ruleset } from '@/lib/utils/rules';
import { rerollTokenOn } from '@/lib/utils/rules/reroll-token-on';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { BattleParticipant } from '@/types/battle';

export const INSPIRATION_LABEL = textRef('inspirationLog.rollMode');

export function canUseInspiration(
    p: BattleParticipant | undefined | null,
    rules: Ruleset | undefined | null
): boolean {
    return (
        !!p &&
        !!rules &&
        rerollTokenOn(rules) &&
        !!ruleSystemOf(rules).combat.rerollToken?.available(p)
    );
}

export function spendInspiration(
    ps: BattleParticipant[],
    id: string,
    rules: Ruleset
): BattleParticipant[] {
    const hook = ruleSystemOf(rules).combat.rerollToken;

    return hook
        ? ps.map((p) => (p.basicInfo.id === id ? hook.spend(p) : p))
        : ps;
}
