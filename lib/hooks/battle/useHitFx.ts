"use client";

import { useEffect, useMemo, useState } from "react";

import { onFxImpact } from "./fx-impact";
import { type HpChange, useDamageShake, useHpChange } from "./useHpChange";

import type { FxImpact } from "@/lib/utils/battle/fx";
import type { BattleParticipant } from "@/types/battle";

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

/** До удару анімації показує учасника з HP і статусом до зміни, щоб HUD не випереджав анімацію. */
function useShownParticipant(participant: BattleParticipant, change: HpChange | null): BattleParticipant {
  const { currentHp: hp, status } = participant.combatStats;

  const [settled, setSettled] = useState({ hp, status });

  const current = settled.hp === hp || change?.hp === hp;

  if (current && (settled.hp !== hp || settled.status !== status)) setSettled({ hp, status });

  return useMemo(
    () => (current ? participant : { ...participant, combatStats: { ...participant.combatStats, currentHp: settled.hp, status: settled.status } }),
    [current, participant, settled],
  );
}

/** Зміна HP і учасник для HUD — обидва оновлюються в момент удару анімації цієї дії. */
export function useHitChange(participant: BattleParticipant, impact: FxImpact | null) {
  const change = useImpactReveal(useHpChange(participant.combatStats.currentHp, impact));

  return { change, shown: useShownParticipant(participant, change) };
}

/** Зміна HP → декорації удару (спалах, число, струс) у момент удару анімації цієї дії. */
export function useHitFx<T extends HTMLElement>(participant: BattleParticipant, impact: FxImpact | null) {
  const { change, shown } = useHitChange(participant, impact);

  const shakeRef = useDamageShake<T>(change);

  return { change, shown, shakeRef };
}
