import { SECTION_DEFAULTS } from '@/lib/utils/rules/defaults';
import type { Ruleset } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { CritRules } from '@/lib/utils/rules/systems/types';

export const critRulesOf = (rules: Ruleset | undefined): CritRules =>
    (rules && ruleSystemOf(rules).combat.crit?.(rules)) ||
    SECTION_DEFAULTS.criticals;
