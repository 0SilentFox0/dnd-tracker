import { BREATH_DEFAULT_RANGE_FT, NIGHT_VISION_FT, REGENERATE_DICE } from "./constants";

import type { Effect, TraitEffect } from "@/lib/utils/abilities/schema";
import type { Trigger } from "@/lib/utils/abilities/schema";
import { PSYCHOLOGY_KINDS, TRAIT_SIZES } from "@/lib/utils/abilities/schema/kinds";
import type { ParamDef, Recipe, RecipeValues } from "@/lib/utils/abilities/templates/types";

const PASSIVE: Trigger = { event: "passive" };

const num = (key: string, def: number, min: number, max: number): ParamDef => ({ key, kind: "number", default: def, min, max });

const select = (key: string, def: string, options: readonly string[]): ParamDef => ({ key, kind: "select", default: def, options });

const MAGICAL = select("magical", "no", ["no", "yes"]);

const trait = (e: TraitEffect) => e as unknown as Effect;

const passive = (id: string, params: ParamDef[], effects: (v: RecipeValues) => Effect[]): Recipe => ({
  id,
  category: "traits",
  scopes: ["ability"],
  textKey: `wfrpTraits.recipes.${id}`,
  params,
  build: (v, ctx) => ({ ability: { name: ctx.name, trigger: PASSIVE, effects: effects(v) } }),
});

const note = (id: string): Recipe => ({
  id,
  category: "traits",
  scopes: ["ability"],
  textKey: `wfrpTraits.recipes.${id}`,
  params: [],
  build: (_v, ctx) => ({ ability: { name: ctx.name, trigger: PASSIVE, effects: [{ kind: "note", text: ctx.name }] } }),
});

const attack = (id: "bite" | "claw" | "weapon" | "breath", extra: ParamDef[] = []) =>
  passive(id, [num("damage", 3, 0, 30), ...extra, MAGICAL], (v) => [
    trait({ kind: "wfrpAttack", attack: id, damage: Number(v.damage), ...(id === "breath" && { rangeFt: Number(v.rangeFt) }), ...(v.magical === "yes" && { magical: true as const }) }),
  ]);

export const TRAIT_RECIPES: readonly Recipe[] = [
  passive("armour", [num("ap", 1, 0, 12)], (v) => [trait({ kind: "wfrpArmour", head: Number(v.ap), body: Number(v.ap), arm: Number(v.ap), leg: Number(v.ap) })]),
  passive("ward", [num("value", 9, 1, 10)], (v) => [trait({ kind: "wfrpWard", value: Number(v.value) })]),
  passive("size", [select("size", "large", TRAIT_SIZES)], (v) => [trait({ kind: "wfrpSize", size: v.size as (typeof TRAIT_SIZES)[number] })]),
  passive("fear", [select("psychology", "fear", PSYCHOLOGY_KINDS), num("value", 1, 1, 10)], (v) => [trait({ kind: "wfrpPsychology", psychology: v.psychology as (typeof PSYCHOLOGY_KINDS)[number], value: Number(v.value) })]),
  {
    id: "regenerate",
    category: "traits",
    scopes: ["ability"],
    textKey: "wfrpTraits.recipes.regenerate",
    params: [],
    build: (_v, ctx) => ({ ability: { name: ctx.name, trigger: { event: "turnStart" }, effects: [{ kind: "heal", amount: REGENERATE_DICE, target: "self" }] } }),
  },
  attack("bite"),
  attack("claw"),
  attack("weapon"),
  attack("breath", [num("rangeFt", BREATH_DEFAULT_RANGE_FT, 5, 600)]),
  passive("nightVision", [], () => [{ kind: "flag", flag: "sense", sense: "darkvision", range: NIGHT_VISION_FT }]),
  note("undead"),
  note("hardy"),
  note("flier"),
  note("swarm"),
];
