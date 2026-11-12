import { CONDITION_5E_KEYS, CONDITION_KEYS } from "@/lib/utils/abilities/schema/kinds";
import { ability, both,dual, fx, num, PASSIVE, range, rounds } from "@/lib/utils/abilities/templates/kit";
import type { Recipe } from "@/lib/utils/abilities/templates/types";

export const D20_ABILITY_RECIPES: readonly Recipe[] = [
  {
    id: "spellSlots",
    category: "resource",
    scopes: ["ability"],
    params: [{ key: "level", kind: "select", default: 1, options: range(1, 9) }, num("count", 1, 1, 5)],
    build: (v, ctx) => ability(PASSIVE, [fx("modifyStat", PASSIVE, { stat: "spellSlots", spellLevels: [Number(v.level)], flat: v.count })])(v, ctx),
  },
  {
    id: "condition",
    category: "control",
    scopes: both,
    params: [{ key: "condition", kind: "select", default: "stunned", options: [...CONDITION_5E_KEYS, ...CONDITION_KEYS] }, rounds(1)],
    build: dual((v, t) => [fx("applyCondition", t, { condition: v.condition, duration: { rounds: v.rounds } })]),
  },
  {
    id: "concentrationBuff",
    category: "support",
    scopes: ["spell"],
    params: [num("value", 2, 1, 5), rounds(5)],
    build: dual((v, t) => [fx("modifyStat", t, { stat: "armor", flat: v.value, duration: { rounds: v.rounds } })], { concentration: true }),
  },
];
