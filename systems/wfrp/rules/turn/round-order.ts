import { wfrpState, withWfrpState } from '../state';

import type { TurnHook, TurnHookCtx } from '@/lib/utils/rules/systems/types';

/** Oops "act last": fighters flagged in the previous round move to the end of the order; the Oops SL penalty then covers the new round */
export const wfrpRoundOrder: TurnHook<TurnHookCtx> = (ctx) => {
    const flagged = (id: string) =>
        ctx.participants.some(
            (p) => p.basicInfo.id === id && wfrpState(p).actLastNext
        );

    const stepped = ctx.participants.map((p) => {
        const { actLastNext, oopsPenalty } = wfrpState(p);

        if (!actLastNext && !oopsPenalty) return p;

        return withWfrpState(p, {
            actLastNext: undefined,
            oopsPenalty: oopsPenalty === 'next' ? 'now' : undefined,
        });
    });

    const last = stepped.filter((p) => flagged(p.basicInfo.id));

    return {
        participants: last.length
            ? [
                  ...stepped.filter((p) => !flagged(p.basicInfo.id)),
                  ...last,
              ]
            : stepped,
        messages: [],
    };
};
