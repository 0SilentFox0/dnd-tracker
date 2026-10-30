import type { ParamDef, Recipe, RecipeCategory, RecipeContext, RecipeScope, RecipeValues } from "./types";

import { DAMAGE_ELEMENT_OPTIONS } from "@/lib/constants/damage";
import { newEffect } from "@/lib/utils/abilities/editor";
import type { Effect, EffectKind, Trigger } from "@/lib/utils/abilities/schema";
import { CONDITION_5E_KEYS, CONDITION_KEYS, DAMAGE_FILTER_KINDS, STAT_KEYS } from "@/lib/utils/abilities/schema/kinds";
import { SPELL_EFFECT_TRIGGER } from "@/lib/utils/spells/editor/spell-only";
import type { SpellEffect } from "@/lib/utils/spells/model/schema";

export const RECIPE_CATEGORIES: readonly RecipeCategory[] = ["defense", "offense", "support", "resource", "control"];

const PASSIVE: Trigger = { event: "passive" };

const range = (from: number, to: number, step = 1) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => String(from + i * step));

const DAMAGE_TYPES = DAMAGE_ELEMENT_OPTIONS.map((o) => o.value);

const fx = (kind: EffectKind, trigger: Trigger, patch: Record<string, unknown> = {}) => {
  const effect: Record<string, unknown> = { ...newEffect(kind, trigger), ...patch };

  for (const key of Object.keys(effect)) if (effect[key] === undefined) delete effect[key];

  return effect as Effect;
};

const num = (key: string, def: number, min: number, max: number): ParamDef => ({ key, kind: "number", default: def, min, max });

const dice = (def: string): ParamDef => ({ key: "dice", kind: "dice", default: def });

const damageType = (def: string): ParamDef => ({ key: "damageType", kind: "damageType", default: def, options: DAMAGE_TYPES });

const rounds = (def: number) => num("rounds", def, 1, 10);

function ability(trigger: Trigger, effects: Effect[], limits?: { perBattle: number }) {
  return (_v: RecipeValues, ctx: RecipeContext) => ({ ability: { name: ctx.name, trigger, ...(limits ? { limits } : {}), effects } });
}

function dual(make: (v: RecipeValues, trigger: Trigger) => Effect[], opts: { concentration?: boolean } = {}): Recipe["build"] {
  return (v, ctx) => {
    if (ctx.scope === "spell") return { spell: make(v, SPELL_EFFECT_TRIGGER) as SpellEffect[], ...(opts.concentration ? { concentration: true } : {}) };

    return { ability: { name: ctx.name, trigger: SPELL_EFFECT_TRIGGER, limits: { perBattle: 1 }, effects: make(v, SPELL_EFFECT_TRIGGER) } };
  };
}

const both: readonly RecipeScope[] = ["ability", "spell"];

export const RECIPES: readonly Recipe[] = [
  {
    id: "stats",
    category: "support",
    scopes: ["ability"],
    params: [{ key: "stat", kind: "stat", default: "armor", options: STAT_KEYS.filter((k) => k !== "spellSlots") }, num("value", 1, 1, 10)],
    build: (v, ctx) => ability(PASSIVE, [fx("modifyStat", PASSIVE, { stat: v.stat, flat: v.value })])(v, ctx),
  },
  {
    id: "damage",
    category: "offense",
    scopes: ["ability"],
    params: [{ key: "filter", kind: "select", default: "melee", options: DAMAGE_FILTER_KINDS }, num("percent", 10, 1, 100)],
    build: (v, ctx) => ability(PASSIVE, [fx("damageBonus", PASSIVE, { filter: { kind: v.filter }, percent: v.percent })])(v, ctx),
  },
  {
    id: "onHit",
    category: "offense",
    scopes: ["ability"],
    params: [dice("1d4"), damageType("bleed"), rounds(2)],
    build: (v, ctx) => {
      const trigger: Trigger = { event: "hit", role: "attacker" };

      return ability(trigger, [fx("dot", trigger, { damagePerRound: v.dice, damageType: v.damageType, duration: { rounds: v.rounds } })])(v, ctx);
    },
  },
  {
    id: "resistance",
    category: "defense",
    scopes: ["ability"],
    params: [damageType("slashing"), num("percent", 25, 1, 100)],
    build: (v, ctx) => ability(PASSIVE, [fx("flag", PASSIVE, { flag: "resistance", attackKind: undefined, damageType: v.damageType, percent: v.percent })])(v, ctx),
  },
  {
    id: "aura",
    category: "support",
    scopes: ["ability"],
    params: [num("value", 1, 1, 5)],
    build: (v, ctx) => ability(PASSIVE, [fx("modifyStat", PASSIVE, { stat: "armor", flat: v.value, target: "allAllies" })])(v, ctx),
  },
  {
    id: "survive",
    category: "defense",
    scopes: ["ability"],
    params: [],
    build: (v, ctx) => {
      const trigger: Trigger = { event: "lethalDamage" };

      return ability(trigger, [fx("heal", trigger, { amount: 1, revive: true })], { perBattle: 1 })(v, ctx);
    },
  },
  {
    id: "bonusAction",
    category: "support",
    scopes: ["ability"],
    params: [dice("1d10")],
    build: (v, ctx) => {
      const trigger: Trigger = { event: "bonusAction" };

      return ability(trigger, [fx("heal", trigger, { amount: v.dice })], { perBattle: 1 })(v, ctx);
    },
  },
  {
    id: "spellSlots",
    category: "resource",
    scopes: ["ability"],
    params: [{ key: "level", kind: "select", default: 1, options: range(1, 9) }, num("count", 1, 1, 5)],
    build: (v, ctx) => ability(PASSIVE, [fx("modifyStat", PASSIVE, { stat: "spellSlots", spellLevels: [Number(v.level)], flat: v.count })])(v, ctx),
  },
  {
    id: "damageSpell",
    category: "offense",
    scopes: both,
    params: [dice("1d8"), damageType("fire")],
    build: dual((v, t) => [fx("dealDamage", t, { amount: v.dice, damageType: v.damageType })]),
  },
  {
    id: "healSpell",
    category: "support",
    scopes: both,
    params: [dice("1d8")],
    build: dual((v, t) => [fx("heal", t, { amount: v.dice })]),
  },
  {
    id: "dotSpell",
    category: "offense",
    scopes: both,
    params: [dice("1d4"), damageType("poison"), rounds(3)],
    build: dual((v, t) => [fx("dot", t, { damagePerRound: v.dice, damageType: v.damageType, duration: { rounds: v.rounds } })]),
  },
  {
    id: "hotSpell",
    category: "support",
    scopes: both,
    params: [dice("1d4"), rounds(3)],
    build: dual((v, t) => [fx("hot", t, { healPerRound: v.dice, duration: { rounds: v.rounds } })]),
  },
  {
    id: "condition",
    category: "control",
    scopes: both,
    params: [{ key: "condition", kind: "select", default: "stunned", options: [...CONDITION_5E_KEYS, ...CONDITION_KEYS] }, rounds(1)],
    build: dual((v, t) => [fx("applyCondition", t, { condition: v.condition, duration: { rounds: v.rounds } })]),
  },
  {
    id: "pushBack",
    category: "control",
    scopes: both,
    params: [{ key: "feet", kind: "select", default: 10, options: range(5, 30, 5) }],
    build: dual((v, t) => [fx("push", t, { feet: Number(v.feet), from: "caster" })]),
  },
  {
    id: "buffArmor",
    category: "support",
    scopes: both,
    params: [num("value", 2, 1, 5), rounds(3)],
    build: dual((v, t) => [fx("modifyStat", t, { stat: "armor", flat: v.value, duration: { rounds: v.rounds } })]),
  },
  {
    id: "cleanse",
    category: "support",
    scopes: both,
    params: [],
    build: dual((_v, t) => [fx("cleanse", t)]),
  },
  {
    id: "morale",
    category: "support",
    scopes: both,
    params: [{ key: "delta", kind: "select", default: 1, options: range(-3, 3).filter((s) => s !== "0") }],
    build: dual((v, t) => [fx("changeMorale", t, { delta: Number(v.delta) })]),
  },
  {
    id: "concentrationBuff",
    category: "support",
    scopes: ["spell"],
    params: [num("value", 2, 1, 5), rounds(5)],
    build: dual((v, t) => [fx("modifyStat", t, { stat: "armor", flat: v.value, duration: { rounds: v.rounds } })], { concentration: true }),
  },
];
