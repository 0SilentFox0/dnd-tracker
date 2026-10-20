"use client";

import { useCallback, useMemo, useState } from "react";

import { useModeView } from "./modes/useModeView";
import { moraleDiceDone } from "./morale-dice";
import { useBattleSceneData } from "./useBattleScene";

import { usePageHidden } from "@/lib/hooks/common";
import { advanceFxQueue, INITIAL_FX_QUEUE, isMoraleFx, shiftFxQueue } from "@/lib/utils/battle/fx";
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

  const done = useCallback((key: string) => {
    if (isMoraleFx(key)) moraleDiceDone();

    setState((s) => shiftFxQueue(s, key));
  }, []);

  return { current: active ? (state.queue[0] ?? null) : null, queue: state.queue, done, active };
}
