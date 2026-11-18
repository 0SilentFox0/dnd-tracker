import type { Ruleset } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';

/** The flag is stored per campaign; without the inspiration module it has no effect */
export const inspirationOn = (rules: Ruleset): boolean =>
    rules.outOfCombat.inspiration && !!ruleSystemOf(rules).combat.rerollToken;
