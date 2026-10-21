"use client";

import { useEffect, useState } from "react";

import { onFxImpact } from "./fx-impact";
import { type HpChange, useDamageShake, useHpChange } from "./useHpChange";

import type { FxImpact } from "@/lib/utils/battle/fx";

function useImpactReveal(change: HpChange | null): HpChange | null {
  const [revealed, setRevealed] = useState<number | null>(null);

  const id = change?.id ?? null;

  const actionId = change?.impact?.actionId;

  const waitMs = change?.impact?.waitMs ?? 0;

  useEffect(() => {
    if (id === null || !actionId) return;

    return onFxImpact(actionId, waitMs, () => setRevealed(id));
  }, [id, actionId, waitMs]);

  if (!change) return null;

  return !actionId || revealed === change.id ? change : null;
}

/** Зміна HP, показана в момент удару анімації цієї дії. */
export function useHitChange(hp: number, impact: FxImpact | null): HpChange | null {
  return useImpactReveal(useHpChange(hp, impact));
}

/** Зміна HP → декорації удару (спалах, число, струс) у момент удару анімації цієї дії. */
export function useHitFx<T extends HTMLElement>(hp: number, impact: FxImpact | null) {
  const change = useHitChange(hp, impact);

  const shakeRef = useDamageShake<T>(change);

  return { change, shakeRef };
}
