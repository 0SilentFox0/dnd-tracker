"use client";

import { useCallback, useMemo } from "react";

import { useBattleSceneData } from "./useBattleScene";
import { useFxEnabled } from "./useFxEnabled";

import { type FxImpact, impactFor, mapAction,MAX_FX_MS } from "@/lib/utils/battle/fx";
import { DICE_TOTAL_MS } from "@/lib/utils/battle/fx/dice";
import type { BattleAction } from "@/types/battle";

const FX_IMPACT_SLACK_MS = 1500;

function lastLogged(log: BattleAction[]): BattleAction | undefined {
  return log.reduce<BattleAction | undefined>((m, a) => (!a.isCancelled && (!m || a.actionIndex > m.actionIndex) ? a : m), undefined);
}

/** Рядки отримують вплив пропом, щоб не підписуватись на контекст сцени; об'єкти стабільні між рендерами. */
export function useFxImpacts(): (participantId: string) => FxImpact | null {
  const log = useBattleSceneData().battle.battleLog;

  const { enabled } = useFxEnabled();

  const impacts = useMemo(() => {
    const last = enabled ? lastLogged(log) : undefined;

    if (!last) return new Map<string, FxImpact | null>();

    const specs = mapAction(last);

    const main = specs.find((s) => s.archetype !== "dice");

    // кадр чекає кубики цієї дії й саму анімацію; далі — запобіжник
    const waitMs = specs.filter((s) => s.archetype === "dice").length * DICE_TOTAL_MS + MAX_FX_MS + FX_IMPACT_SLACK_MS;

    return new Map(
      (main?.targetIds ?? []).map((id) => {
        const impact = impactFor(main, id);

        return [id, impact && { ...impact, actionId: last.id, waitMs }] as const;
      }),
    );
  }, [log, enabled]);

  return useCallback((participantId: string) => impacts.get(participantId) ?? null, [impacts]);
}
