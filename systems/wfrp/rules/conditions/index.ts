import { applyWfrpCondition, reduceWfrpConditionIn, UNTIMED_CONDITIONS } from "./apply";
import { isWfrpConditionKey, WFRP_CONDITION_KEYS, WFRP_CONDITION_REGISTRY, wfrpConditionEffectKey } from "./catalog";
import { concealWfrpLine, isWfrpMiscastLine } from "./conceal";
import { attemptWfrpConditionEnd } from "./end-test";
import { wfrpConditions } from "./levels";
import { wfrpConditionsTurnStart, wfrpSkippedTurn } from "./tick";

import type { RuleSystemConditions } from "@/lib/utils/rules/systems/types";

const WFRP_CONDITION_EFFECT_PREFIX = wfrpConditionEffectKey("bleeding").replace(/bleeding$/, "");

export const WFRP_CONDITIONS: RuleSystemConditions = {
  catalog: WFRP_CONDITION_KEYS.map((key) => {
    const d = WFRP_CONDITION_REGISTRY[key];

    return { key, maxLevel: d.leveled ? d.leveled.max : null, endTest: d.endTest === null ? null : d.endTest === "stand" ? "stand" : "roll", timed: !UNTIMED_CONDITIONS.has(key), label: `battleWfrp.conditions.${key}.label` };
  }),
  concealLine: concealWfrpLine,
  isMiscastLine: isWfrpMiscastLine,
  list: wfrpConditions,
  apply: (ps, id, input) => (isWfrpConditionKey(input.key) ? applyWfrpCondition(ps, id, { ...input, key: input.key }) : { participants: ps, messages: [] }),
  reduce: reduceWfrpConditionIn,
  turnStart: wfrpConditionsTurnStart,
  skippedTurn: wfrpSkippedTurn,
  keepDownedAfterVictory: true,
  keepsWhenDown: (effect) => effect.abilityKey?.startsWith(WFRP_CONDITION_EFFECT_PREFIX) ?? false,
  attemptEnd: attemptWfrpConditionEnd,
};
