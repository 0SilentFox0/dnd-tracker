import type { Ruleset } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';

/** The campaign switch lives in the module's rules item; without the module there is no token */
export const rerollTokenOn = (rules: Ruleset): boolean =>
    !!ruleSystemOf(rules).combat.rerollToken?.enabled(rules);

/** `null` when the token is off; otherwise the module's dual-store reader */
export const storedInspiration = (
    rules: Ruleset,
    row: { inspiration?: boolean | null; characteristics?: unknown }
): boolean | null => {
    const hook = ruleSystemOf(rules).combat.rerollToken;

    return hook?.enabled(rules) ? hook.stored(row) : null;
};
