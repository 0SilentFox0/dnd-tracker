'use client';

import { useEffect, useEffectEvent, useState } from 'react';

import { useBattleScene } from './useBattleScene';

import { ApiError } from '@/lib/api/client';
import {
    COUNTER_NUDGE_DM_MS,
    COUNTER_NUDGE_MEMBER_MS,
    COUNTER_WINDOW_MS,
} from '@/lib/constants/battle';
import { useCounterWindowOp } from '@/lib/hooks/battles';
import { asShownCounter } from '@/lib/utils/battle/counter/pending';
import type {
    CounterOffer,
    ShownCounter,
} from '@/lib/utils/battle/counter/types';

const TICK_MS = 250;

const RETRY_SLACK_MS = 50;

const silent = { onConflict: () => undefined };

export interface CounterOfferView {
    offer: CounterOffer;
    name: string;
    canCounter: boolean;
    /** the DM answering on behalf of a player-controlled reactor */
    passForPlayer: boolean;
}

function useCounterContext() {
    const { battle, viewer } = useBattleScene();

    const shown = asShownCounter(battle.pendingChoice);

    const infoOf = (id: string) =>
        battle.initiativeOrder.find((p) => p.basicInfo.id === id)?.basicInfo;

    const controls = (id: string) =>
        !!viewer.userId && infoOf(id)?.controlledBy === viewer.userId;

    const nameOf = (id: string) => infoOf(id)?.name ?? '';

    return { shown, viewer, controls, nameOf };
}

const retryAfterOf = (error: unknown): number | null => {
    if (!(error instanceof ApiError) || error.status !== 422) return null;

    const wait = (error.body as { params?: { retryAfterMs?: unknown } })?.params
        ?.retryAfterMs;

    return typeof wait === 'number' ? wait : null;
};

/** One client sends `expire` after the deadline: the requester first, then the DM, then any member */
export function useCounterNudge() {
    const { campaignId, battleId } = useBattleScene();

    const { shown, viewer, controls } = useCounterContext();

    const { mutate } = useCounterWindowOp(campaignId, battleId, silent);

    const windowId = shown?.windowId;

    const deadline = shown?.deadline;

    const delay =
        shown && controls(shown.actorId)
            ? 0
            : viewer.isDM
              ? COUNTER_NUDGE_DM_MS
              : COUNTER_NUDGE_MEMBER_MS;

    const expire = useEffectEvent(
        (id: string, onRetry: (waitMs: number) => void) =>
            mutate(
                { action: 'expire', windowId: id },
                {
                    onError: (error) => {
                        const wait = retryAfterOf(error);

                        if (wait !== null) onRetry(wait);
                    },
                }
            )
    );

    useEffect(() => {
        if (!windowId || !deadline || viewer.readOnly) return;

        let cancelled = false;

        let timer: ReturnType<typeof setTimeout>;

        timer = setTimeout(
            () =>
                expire(windowId, (wait) => {
                    if (cancelled) return;

                    timer = setTimeout(
                        () => expire(windowId, () => undefined),
                        wait + RETRY_SLACK_MS
                    );
                }),
            Math.max(0, Date.parse(deadline) - Date.now()) + delay
        );

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [windowId, deadline, delay, viewer.readOnly]);
}

export function useCounterWindow(): {
    window: ShownCounter | null;
    isDM: boolean;
    caster: string;
    secondsLeft: number;
    offers: CounterOfferView[];
    isPending: boolean;
    counter(offer: CounterOffer, slotLevel?: number): void;
    pass(offer: CounterOffer): void;
    closeAll(): void;
} {
    const { actions } = useBattleScene();

    const { shown, viewer, controls, nameOf } = useCounterContext();

    const [now, setNow] = useState(() => Date.now());

    const open = !!shown;

    useEffect(() => {
        if (!open) return;

        const id = setInterval(() => setNow(Date.now()), TICK_MS);

        return () => clearInterval(id);
    }, [open]);

    const offers = (shown?.offers ?? [])
        .filter((o) => o.answer === undefined)
        .flatMap((offer): CounterOfferView[] => {
            const mine = controls(offer.reactorId);

            if (viewer.readOnly || (!viewer.isDM && !mine)) return [];

            return [
                {
                    offer,
                    name: nameOf(offer.reactorId),
                    canCounter: offer.dm ? viewer.isDM : mine,
                    passForPlayer: viewer.isDM && !offer.dm && !mine,
                },
            ];
        });

    const send = (
        body:
            | { action: 'counter'; reactorId: string; slotLevel?: number }
            | { action: 'pass'; reactorId: string }
            | { action: 'closeAll' }
    ) => {
        if (shown)
            actions.counterWindow.mutate({ ...body, windowId: shown.windowId });
    };

    return {
        window: shown,
        isDM: viewer.isDM,
        caster: shown ? nameOf(shown.actorId) : '',
        secondsLeft: shown
            ? Math.ceil(
                  Math.max(
                      0,
                      Math.min(
                          COUNTER_WINDOW_MS,
                          Date.parse(shown.deadline) - now
                      )
                  ) / 1000
              )
            : 0,
        offers,
        isPending: actions.counterWindow.isPending,
        counter: (offer, slotLevel) =>
            send({
                action: 'counter',
                reactorId: offer.reactorId,
                ...(offer.slotLevels.length > 0 &&
                    slotLevel !== undefined && { slotLevel }),
            }),
        pass: (offer) => send({ action: 'pass', reactorId: offer.reactorId }),
        closeAll: () => send({ action: 'closeAll' }),
    };
}
