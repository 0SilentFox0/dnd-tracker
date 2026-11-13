import { SECTION_DEFAULTS } from '@/lib/utils/rules/defaults';
import type { Ruleset } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems/registry';

/** Sheet initiative range of the campaign system; a system without the hook gets the section defaults */
export const heroInitiativeRange = (rules: Ruleset) =>
    ruleSystemOf(rules).progression.initiativeRange?.(rules) ?? {
        min: SECTION_DEFAULTS.initiative.heroMin,
        max: SECTION_DEFAULTS.initiative.heroMax,
    };
