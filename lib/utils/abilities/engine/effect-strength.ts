import { resolveFlat } from "./amount";

import type { StaticEffect } from "@/lib/utils/abilities/schema";
import type { BattleParticipant } from "@/types/battle";

/** Сила статичного ефекту для порівняння однакових аур: |flat| + |percent|, прапорці — їхній параметр або 1. Формули — лише з власником. */
export function staticEffectStrength(effect: StaticEffect, owner?: BattleParticipant): number {
  const num = (v: unknown) => (typeof v === "number" ? v : v && owner ? resolveFlat(v as Parameters<typeof resolveFlat>[0], owner) : 0);

  if (effect.kind === "flag") return Math.abs("percent" in effect ? effect.percent : "value" in effect ? effect.value : 1);

  return Math.abs(num("flat" in effect ? effect.flat : undefined)) + Math.abs(num("percent" in effect ? effect.percent : undefined));
}
