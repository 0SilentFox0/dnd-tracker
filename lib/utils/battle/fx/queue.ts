import { mapAction } from './map-action';
import { takeNewActions } from './new-events';
import type { SystemDice } from './system-dice';
import type { FxSpec } from './types';

import type { BattleAction } from '@/types/battle';

export interface FxQueueState {
    log: BattleAction[] | null;
    seen: number | null;
    queue: FxSpec[];
    /** undefined = ще не бачили (перший рендер не програє кубик) */
    dice?: string[];
}

export interface FxQueueInput {
    log: BattleAction[];
    dice: SystemDice[];
}

const diceFx = ({ key, spec, actorId }: SystemDice): FxSpec => ({
    key,
    archetype: 'dice',
    element: 'arcane',
    actorId,
    actorSide: 'ally',
    targetIds: [],
    hit: true,
    critical: false,
    dice: spec,
});

export const sameKeys = (a: string[] | undefined, b: string[]) =>
    !!a && a.length === b.length && a.every((k, i) => k === b[i]);

export const INITIAL_FX_QUEUE: FxQueueState = {
    log: null,
    seen: null,
    queue: [],
};

export const MAX_FX_QUEUE = 32;

/** Дія, що грає (усі її спеки), лишається; решта обрізається найстарішими діями цілком, щоб залп не втратив середину. */
export function trimFxQueue(queue: FxSpec[], max: number): FxSpec[] {
    if (queue.length <= max) return queue;

    const headId = queue[0].actionId;

    const isHead = (s: FxSpec, i: number) =>
        i === 0 || (headId !== undefined && s.actionId === headId);

    const head = queue.filter(isHead);

    let tail = queue.filter((s, i) => !isHead(s, i));

    const groupOf = (s: FxSpec) => s.actionId ?? s.key;

    while (tail.length > 0 && head.length + tail.length > max) {
        const oldest = groupOf(tail[0]);

        const dropped = tail.filter((s) => groupOf(s) !== oldest);

        tail = dropped.length === tail.length ? tail.slice(1) : dropped;
    }

    return [...head, ...tail];
}

/** `active` = FX увімкнено і вкладка видима; неактивна черга лише просуває `seen`, тож після повернення нічого не програється пачкою. */
export function advanceFxQueue(
    state: FxQueueState,
    { log, dice }: FxQueueInput,
    active: boolean
): FxQueueState {
    const diceKeys = dice.map((d) => d.key);

    if (
        state.log === log &&
        sameKeys(state.dice, diceKeys) &&
        (active || !state.queue.length)
    )
        return state;

    const { actions, seen } = takeNewActions(log, state.seen);

    if (!active) return { log, seen, queue: [], dice: diceKeys };

    const diceSpecs = state.dice
        ? dice.filter((d) => !state.dice?.includes(d.key)).map(diceFx)
        : [];

    const queue = [
        ...state.queue,
        ...diceSpecs,
        ...actions.flatMap(mapAction),
    ];

    return {
        log,
        seen,
        queue: trimFxQueue(queue, MAX_FX_QUEUE),
        dice: diceKeys,
    };
}

/** Знімає голову лише якщо це та сама анімація: запізнілий `done` після очищення черги нічого не пропускає. */
export function shiftFxQueue(state: FxQueueState, key: string): FxQueueState {
    return state.queue[0]?.key === key
        ? { ...state, queue: state.queue.slice(1) }
        : state;
}
