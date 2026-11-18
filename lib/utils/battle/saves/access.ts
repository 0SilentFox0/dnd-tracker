import { noProficiency, noSaves } from './none';

import type { Ruleset } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';

export const savesOf = (rules: Pick<Ruleset, 'system'>) =>
    ruleSystemOf(rules).combat.saves ?? noSaves;

export const proficiencyOf = (rules: Pick<Ruleset, 'system'>) =>
    ruleSystemOf(rules).combat.proficiency ?? noProficiency;
