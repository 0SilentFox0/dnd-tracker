import { both, dual, fx, range } from "@/lib/utils/abilities/templates/kit";
import type { Recipe } from "@/lib/utils/abilities/templates/types";

export const MORALE_ABILITY_RECIPES: readonly Recipe[] = [
  {
    id: "morale",
    category: "support",
    scopes: both,
    params: [{ key: "delta", kind: "select", default: 1, options: range(-3, 3).filter((s) => s !== "0") }],
    build: dual((v, t) => [fx("changeMorale", t, { delta: Number(v.delta) })]),
  },
];
