"use client";

import { useDamageShake, useHpChange } from "./useHpChange";

import type { FxImpact } from "@/lib/utils/battle/fx";

/** Зміна HP → тремтіння (`shakeRef` на корінь) і затримка CSS-декорацій до моменту удару (`delayStyle`). */
export function useHitFx<T extends HTMLElement>(hp: number, impact: FxImpact | null) {
  const change = useHpChange(hp, impact);

  const shakeRef = useDamageShake<T>(change);

  return { change, shakeRef, delayStyle: { animationDelay: `${change?.impact?.delayMs ?? 0}ms` } };
}
