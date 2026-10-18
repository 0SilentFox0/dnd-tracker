import { mapAction } from "./map-action";
import { takeNewActions } from "./new-events";
import type { FxSpec } from "./types";

import type { BattleAction } from "@/types/battle";

export interface FxQueueState {
  log: BattleAction[] | null;
  seen: number | null;
  queue: FxSpec[];
}

export const INITIAL_FX_QUEUE: FxQueueState = { log: null, seen: null, queue: [] };

const MAX_FX_QUEUE = 12;

export function advanceFxQueue(state: FxQueueState, log: BattleAction[], enabled: boolean): FxQueueState {
  if (state.log === log) return state;

  const { actions, seen } = takeNewActions(log, state.seen);

  const added = enabled ? actions.flatMap(mapAction) : [];

  return { log, seen, queue: [...state.queue, ...added].slice(-MAX_FX_QUEUE) };
}

export function shiftFxQueue(state: FxQueueState): FxQueueState {
  return { ...state, queue: state.queue.slice(1) };
}
