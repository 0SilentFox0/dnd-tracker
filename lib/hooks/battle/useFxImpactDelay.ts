"use client";

import { useCallback } from "react";

import { useBattleSceneData } from "./useBattleScene";
import { useFxEnabled } from "./useFxEnabled";

import { impactDelayFor } from "@/lib/utils/battle/fx";
import type { BattleAction } from "@/types/battle";

function lastLogged(log: BattleAction[]): BattleAction | undefined {
  return log.reduce<BattleAction | undefined>((m, a) => (!a.isCancelled && (!m || a.actionIndex > m.actionIndex) ? a : m), undefined);
}

/** Рядки отримують затримку числом (prop), щоб не підписуватись на контекст сцени. */
export function useFxImpactDelays(): (participantId: string) => number {
  const log = useBattleSceneData().battle.battleLog;

  const { enabled } = useFxEnabled();

  return useCallback((participantId: string) => (enabled ? impactDelayFor(lastLogged(log), participantId) : 0), [log, enabled]);
}

export function useFxImpactDelay(participantId: string): number {
  return useFxImpactDelays()(participantId);
}
