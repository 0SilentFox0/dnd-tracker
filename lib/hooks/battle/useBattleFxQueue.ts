"use client";

import { useCallback, useState } from "react";

import { useBattleSceneData } from "./useBattleScene";

import { advanceFxQueue, INITIAL_FX_QUEUE, shiftFxQueue } from "@/lib/utils/battle/fx";

export function useBattleFxQueue(enabled: boolean) {
  const log = useBattleSceneData().battle.battleLog;

  const [state, setState] = useState(INITIAL_FX_QUEUE);

  if (state.log !== log) setState(advanceFxQueue(state, log, enabled));

  const done = useCallback(() => setState(shiftFxQueue), []);

  return { current: state.queue[0] ?? null, done };
}
