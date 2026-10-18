"use client";

import { useCallback, useState } from "react";

import { useBattleSceneData } from "./useBattleScene";
import { usePageHidden } from "./usePageHidden";

import { advanceFxQueue, INITIAL_FX_QUEUE, shiftFxQueue } from "@/lib/utils/battle/fx";

/** Прихована вкладка = вимкнені FX: rAF там стоїть, і все накопичене програлося б разом після повернення. */
export function useBattleFxQueue(enabled: boolean) {
  const log = useBattleSceneData().battle.battleLog;

  const hidden = usePageHidden();

  const active = enabled && !hidden;

  const [state, setState] = useState(INITIAL_FX_QUEUE);

  if (state.log !== log || (!active && state.queue.length)) setState(advanceFxQueue(state, log, active));

  const done = useCallback((key: string) => setState((s) => shiftFxQueue(s, key)), []);

  return { current: active ? (state.queue[0] ?? null) : null, done, active };
}
