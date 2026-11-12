import type { ExhaustionVariant } from "./set";

import type { StaticEffect } from "@/lib/utils/abilities/schema";

// Stays in core: removeEffects re-derives stacked exhaustion without access to the ruleset.
export function exhaustionEffects(level: number, variant: ExhaustionVariant): StaticEffect[] {
  if (level < 1) return [];

  if (variant === "2024") {
    return [
      { kind: "modifyStat", stat: "attackBonus", flat: -2 * level },
      { kind: "modifyStat", stat: "savingThrow", flat: -2 * level },
      { kind: "modifyStat", stat: "speed", flat: -5 * level },
    ];
  }

  const effects: StaticEffect[] = [];

  if (level >= 2) effects.push({ kind: "modifyStat", stat: "speed", percent: level >= 5 ? -100 : -50 });

  if (level >= 3) effects.push({ kind: "flag", flag: "disadvantage" } as StaticEffect, { kind: "flag", flag: "saveDisadvantage", abilities: "all" } as StaticEffect);

  return effects;
}
