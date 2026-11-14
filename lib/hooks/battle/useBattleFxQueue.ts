'use client';

import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';

import { useModeView } from './modes/useModeView';
import { setFxBusy } from './fx-busy';
import { fireFxImpact } from './fx-impact';
import { useSystemDice } from './useSystemDice';

import { usePageHidden } from '@/lib/hooks/common';
import {
    advanceFxQueue,
    INITIAL_FX_QUEUE,
    MAX_FX_QUEUE,
    sameKeys,
    shiftFxQueue,
    type SystemFx,
} from '@/lib/utils/battle/fx';

/** Прихована вкладка = вимкнені FX: rAF там стоїть, і все накопичене програлося б разом після повернення. */
export function useBattleFxQueue(enabled: boolean, fx?: SystemFx) {
    const { fxLog: log } = useModeView();

    const dice = useSystemDice(fx);

    const onDone = useRef(new Map<string, () => void>());

    useEffect(() => {
        for (const d of dice) if (d.onDone) onDone.current.set(d.key, d.onDone);
    }, [dice]);

    const hidden = usePageHidden();

    const active = enabled && !hidden;

    const diceKeys = dice.map((d) => d.key);

    const [state, setState] = useState(INITIAL_FX_QUEUE);

    if (
        state.log !== log ||
        !sameKeys(state.dice, diceKeys) ||
        (!active && state.queue.length)
    )
        setState(advanceFxQueue(state, { log, dice }, active));

    // дія, якої в черзі немає (вже зіграна, пропущена, обрізана, до відкриття сторінки, FX вимкнено), не тримає кадр влучання
    useEffect(() => {
        const queued = new Set(state.queue.map((s) => s.actionId));

        for (const action of log.slice(-MAX_FX_QUEUE))
            if (!queued.has(action.id)) fireFxImpact(action.id);
    }, [log, state.queue]);

    const busy = active && state.queue.length > 0;

    // до відмальовування: екран підсумку в тому ж кадрі ще не встигає показатися поверх кидка
    useLayoutEffect(() => setFxBusy(busy), [busy]);

    useEffect(() => () => setFxBusy(false), []);

    const done = useCallback((key: string) => {
        onDone.current.get(key)?.();
        onDone.current.delete(key);

        setState((s) => shiftFxQueue(s, key));
    }, [setState]);

    return {
        current: active ? (state.queue[0] ?? null) : null,
        queue: state.queue,
        done,
        active,
    };
}
