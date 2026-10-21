"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";

import { useModeView } from "./modes/useModeView";
import { setFxBusy } from "./fx-busy";
import { fireFxImpact } from "./fx-impact";
import { moraleDiceDone } from "./morale-dice";
import { useBattleSceneData } from "./useBattleScene";

import { usePageHidden } from "@/lib/hooks/common";
import { advanceFxQueue, INITIAL_FX_QUEUE, isMoraleFx, MAX_FX_QUEUE, shiftFxQueue } from "@/lib/utils/battle/fx";
import { moraleThrowOf } from "@/lib/utils/battle/fx/dice";
import type { PendingMoraleCheckPayload } from "@/lib/utils/battle/turn";

/** Прихована вкладка = вимкнені FX: rAF там стоїть, і все накопичене програлося б разом після повернення. */
export function useBattleFxQueue(enabled: boolean) {
  const { fxLog: log, visible } = useModeView();

  const { battle } = useBattleSceneData();

  const { currentRound, currentTurnIndex, initiativeOrder } = battle;

  const pending = battle.pendingMoraleCheck as PendingMoraleCheckPayload | null;

  const morale = useMemo(() => {
    const who = pending ? initiativeOrder.find((p) => p.basicInfo.id === pending.participantId) : undefined;

    return moraleThrowOf({ round: currentRound, turnIndex: currentTurnIndex, pending, visible: !!who && visible(who) });
  }, [pending, currentRound, currentTurnIndex, initiativeOrder, visible]);

  const hidden = usePageHidden();

  const active = enabled && !hidden;

  const [state, setState] = useState(INITIAL_FX_QUEUE);

  if (state.log !== log || state.morale !== (morale?.key ?? null) || (!active && state.queue.length)) setState(advanceFxQueue(state, { log, morale }, active));

  // дія, якої в черзі немає (вже зіграна, пропущена, обрізана, до відкриття сторінки, FX вимкнено), не тримає кадр влучання
  useEffect(() => {
    const queued = new Set(state.queue.map((s) => s.actionId));

    for (const action of log.slice(-MAX_FX_QUEUE)) if (!queued.has(action.id)) fireFxImpact(action.id);
  }, [log, state.queue]);

  const busy = active && state.queue.length > 0;

  // до відмальовування: екран підсумку в тому ж кадрі ще не встигає показатися поверх кидка
  useLayoutEffect(() => setFxBusy(busy), [busy]);

  useEffect(() => () => setFxBusy(false), []);

  const done = useCallback((key: string) => {
    if (isMoraleFx(key)) moraleDiceDone();

    setState((s) => shiftFxQueue(s, key));
  }, []);

  return { current: active ? (state.queue[0] ?? null) : null, queue: state.queue, done, active };
}
