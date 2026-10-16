"use client";

import { useState } from "react";

import { buildDisplayEffects } from "@/lib/utils/battle/view";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

/** Раз на зміну черги, не на рядок; незмінні списки ефектів лишаються тими самими масивами. */
export function useDisplayEffectMap(order: BattleParticipant[]): Map<string, ActiveEffect[]> {
  const [state, setState] = useState(() => ({ order, effects: buildDisplayEffects(order) }));

  if (state.order !== order) {
    const next = { order, effects: buildDisplayEffects(order, state.effects) };

    setState(next);

    return next.effects;
  }

  return state.effects;
}
