import { applyCondition5e } from './apply';
import { conditionEffectInput } from './registry';

import type { RuleSystemConditionSet } from '@/lib/utils/rules/systems/types';

export const D20_CONDITION_SET: RuleSystemConditionSet = {
    enabled: (rules) => rules.conditions.enabled,
    custom: (rules) => rules.conditions.custom,
    apply: applyCondition5e,
    effectInput: conditionEffectInput,
};
