import { SECTION_DEFAULTS } from '@/lib/utils/rules/defaults';
import type { Ruleset } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { CritRules } from '@/lib/utils/rules/systems/types';

export const NEUTRAL_CRIT: CritRules = {
    ...SECTION_DEFAULTS.criticals,
    effects: false,
};

export const critRulesOf = (rules: Ruleset | undefined): CritRules =>
    (rules && ruleSystemOf(rules).combat.crit?.(rules)) || NEUTRAL_CRIT;
