"use client";

import { useMemo, useState } from "react";

import { personalPassiveEffects } from "@/lib/utils/battle/view";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

const NONE: ActiveEffect[] = [];

/** Пасивні персональні ефекти кожного учасника; масив лишається тим самим, поки не змінився набір — memo-рядки не перемальовуються. */
export function usePersonalEffects(order: BattleParticipant[]): Map<string, ActiveEffect[]> {
  const [cache] = useState(() => new Map<string, { key: string; list: ActiveEffect[] }>());

  return useMemo(() => {
    const out = new Map<string, ActiveEffect[]>();

    for (const p of order) {
      const list = personalPassiveEffects(p, order);

      const key = list.map((e) => e.id).join("|");

      const prev = cache.get(p.basicInfo.id);

      const stable = prev && prev.key === key ? prev.list : list.length ? list : NONE;

      cache.set(p.basicInfo.id, { key, list: stable });
      out.set(p.basicInfo.id, stable);
    }

    return out;
  }, [order, cache]);
}
