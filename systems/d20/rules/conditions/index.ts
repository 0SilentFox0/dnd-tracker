import { applyCondition5e } from "@/lib/utils/battle/conditions/apply";
import { conditionEffectInput } from "@/lib/utils/battle/conditions/registry";
import type { RuleSystemConditionSet } from "@/lib/utils/rules/systems/types";

export const D20_CONDITION_SET: RuleSystemConditionSet = { apply: applyCondition5e, effectInput: conditionEffectInput };
