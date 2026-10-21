import type { StaticEffect } from "@/lib/utils/abilities/schema";

// менший поріг криту — частіше крит, тобто вигода
const LOWER_IS_BETTER = new Set(["critThreshold"]);

const HARMFUL_FLAGS = new Set(["disadvantage", "advantageForAttackers"]);

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
