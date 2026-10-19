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

export const MAX_FX_QUEUE = 12;

/** `active` = FX увімкнено і вкладка видима; неактивна черга лише просуває `seen`, тож після повернення нічого не програється пачкою. */
export function advanceFxQueue(state: FxQueueState, log: BattleAction[], active: boolean): FxQueueState {
  if (state.log === log && (active || !state.queue.length)) return state;

  const { actions, seen } = takeNewActions(log, state.seen);

  if (!active) return { log, seen, queue: [] };

  const queue = [...state.queue, ...actions.flatMap(mapAction)];

  // the head may be playing right now, so trimming keeps it
  return { log, seen, queue: queue.length > MAX_FX_QUEUE ? [queue[0], ...queue.slice(1 - MAX_FX_QUEUE)] : queue };
}

/** Знімає голову лише якщо це та сама анімація: запізнілий `done` після очищення черги нічого не пропускає. */
export function shiftFxQueue(state: FxQueueState, key: string): FxQueueState {
  return state.queue[0]?.key === key ? { ...state, queue: state.queue.slice(1) } : state;
}
