import { HARMFUL_FLAGS } from "./harmful-flags";

import type { Effect, StaticEffect } from "@/lib/utils/abilities/schema";

// менший поріг криту — частіше крит, тобто вигода
const LOWER_IS_BETTER = new Set(["critThreshold"]);

// без isStaticEffect зі схеми: модуль у клієнтському графі бою, а схема тягне zod
const STATIC_KINDS = new Set(["modifyStat", "damageBonus", "flag"]);

const isStatic = (e: Effect): e is StaticEffect => STATIC_KINDS.has(e.kind);

const signOf = (v: unknown): number | null => (typeof v === "number" && v !== 0 ? Math.sign(v) : null);

/** Шкідливий чи корисний ефект сам по собі; null — не визначити (формула), тоді вирішує сторона цілі. */
export function staticEffectNature(effect: StaticEffect): "buff" | "debuff" | null {
  if (effect.kind === "flag") {
    if (effect.flag === "resistance") return effect.percent < 0 ? "debuff" : "buff";

    return HARMFUL_FLAGS.has(effect.flag) ? "debuff" : "buff";
  }

  const sign = signOf(effect.flat) ?? signOf(effect.percent);

  if (sign === null) return null;

  const good = effect.kind === "modifyStat" && LOWER_IS_BETTER.has(effect.stat) ? sign < 0 : sign > 0;

  return good ? "buff" : "debuff";
}

/** Природа здатності цілком: дебафф/бафф лише коли всі її статичні ефекти однакові, змішана (компроміс) — null. */
export function abilityNature(effects: readonly Effect[]): "buff" | "debuff" | null {
  const natures = effects.filter(isStatic).map(staticEffectNature);

  if (!natures.length || natures.some((n) => n === null)) return null;

  return natures.every((n) => n === "debuff") ? "debuff" : natures.every((n) => n === "buff") ? "buff" : null;
}
