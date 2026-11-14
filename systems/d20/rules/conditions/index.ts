import { applyCondition5e } from './apply';
import { CONDITION_5E_KEYS } from './keys';
import { conditionEffectInput } from './registry';

import type { RuleSystemConditionSet } from '@/lib/utils/rules/systems/types';

export const D20_CONDITION_SET: RuleSystemConditionSet = {
    keys: CONDITION_5E_KEYS,
    labelKey: (key) => `battleCommon.conditions.${key}`,
    enabled: (rules) => rules.conditions.enabled,
    custom: (rules) => rules.conditions.custom,
    apply: applyCondition5e,
    effectInput: conditionEffectInput,
};
