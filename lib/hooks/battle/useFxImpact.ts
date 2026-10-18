"use client";

import { useCallback, useMemo } from "react";

import { useBattleSceneData } from "./useBattleScene";
import { useFxEnabled } from "./useFxEnabled";

import { type FxImpact, impactFor, mapAction } from "@/lib/utils/battle/fx";
import type { BattleAction } from "@/types/battle";

function lastLogged(log: BattleAction[]): BattleAction | undefined {
  return log.reduce<BattleAction | undefined>((m, a) => (!a.isCancelled && (!m || a.actionIndex > m.actionIndex) ? a : m), undefined);
}

/** Рядки отримують вплив пропом, щоб не підписуватись на контекст сцени; об'єкти стабільні між рендерами. */
export function useFxImpacts(): (participantId: string) => FxImpact | null {
  const log = useBattleSceneData().battle.battleLog;

  const { enabled } = useFxEnabled();

  const impacts = useMemo(() => {
    const last = enabled ? lastLogged(log) : undefined;

    const ids = last ? (mapAction(last)[0]?.targetIds ?? []) : [];

    return new Map(ids.map((id) => [id, impactFor(last, id)] as const));
  }, [log, enabled]);

  return useCallback((participantId: string) => impacts.get(participantId) ?? null, [impacts]);
}

export function useFxImpact(participantId: string): FxImpact | null {
  return useFxImpacts()(participantId);
}
