import type { Ruleset } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';

/** The campaign switch lives in the module's rules item; without the module there is no token */
export const rerollTokenOn = (rules: Ruleset): boolean =>
    !!ruleSystemOf(rules).combat.rerollToken?.enabled(rules);
