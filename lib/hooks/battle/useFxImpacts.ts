"use client";

import { useCallback, useMemo } from "react";

import { useBattleSceneData } from "./useBattleScene";
import { useFxEnabled } from "./useFxEnabled";

import { usePageHidden } from "@/lib/hooks/common";
import { type FxImpact, impactFor, mapAction, MAX_FX_BATCH, MAX_FX_MS, splashTargetIds } from "@/lib/utils/battle/fx";
import { DICE_TOTAL_MS } from "@/lib/utils/battle/fx/dice";
import type { BattleAction } from "@/types/battle";

const FX_IMPACT_SLACK_MS = 1500;

function recentActions(log: BattleAction[]): BattleAction[] {
  return log
    .filter((a) => !a.isCancelled)
    .sort((a, b) => a.actionIndex - b.actionIndex)
    .slice(-MAX_FX_BATCH);
}

/** Рядки отримують вплив пропом, щоб не підписуватись на контекст сцени; об'єкти стабільні між рендерами. */
export function useFxImpacts(): (participantId: string) => FxImpact | null {
  const { battle } = useBattleSceneData();

  const log = battle.battleLog;

  const moraleQueued = !!battle.pendingMoraleCheck;

  const { enabled } = useFxEnabled();

  const hidden = usePageHidden();

  const impacts = useMemo(() => {
    const result = new Map<string, FxImpact | null>();

    if (!enabled) return result;

    const actions = recentActions(log).map((action) => {
      const specs = mapAction(action);

      return { action, main: specs.find((s) => s.archetype !== "dice"), dice: specs.filter((s) => s.archetype === "dice").length };
    });

    // запобіжник покриває все, що стоїть у черзі від цієї дії до кінця вікна (кубики, анімації, можлива мораль)
    const waitFrom = (from: number) => {
      const rest = actions.slice(from);

      const dice = rest.reduce((sum, a) => sum + a.dice, 0);

      return dice * DICE_TOTAL_MS + rest.length * MAX_FX_MS + FX_IMPACT_SLACK_MS + (moraleQueued ? DICE_TOTAL_MS : 0);
    };

    actions.forEach(({ action, main }, i) => {
      for (const id of main?.targetIds ?? []) {
        const impact = impactFor(main, id);

        if (!impact) continue;

        // прихована вкладка = FX-черга неактивна: показ без очікування сигналу
        result.set(id, hidden ? impact : { ...impact, actionId: action.id, waitMs: waitFrom(i) });
      }

      for (const id of splashTargetIds(action, main)) {
        const impact = impactFor(main && { ...main, targetIds: [id] }, id);

        if (impact) result.set(id, hidden ? impact : { ...impact, actionId: action.id, waitMs: waitFrom(i) });
      }
    });

    return result;
  }, [log, enabled, moraleQueued, hidden]);

  return useCallback((participantId: string) => impacts.get(participantId) ?? null, [impacts]);
}
