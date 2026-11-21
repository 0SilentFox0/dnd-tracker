import { wfrpState, withWfrpState } from '../state';

import type { TurnHook, TurnHookCtx } from '@/lib/utils/rules/systems/types';

/** Oops "act last": flagged fighters go to the end for one round, then return to their initiative slot; the Oops SL penalty covers the new round */
export const wfrpRoundOrder: TurnHook<TurnHookCtx> = (ctx) => {
    const ids = {
        flagged: new Set<string>(),
        returning: new Set<string>(),
    };

    ctx.participants.forEach((p) => {
        const s = wfrpState(p);

        if (s.actLastNext) ids.flagged.add(p.basicInfo.id);
        else if (s.actLastSlot !== undefined) ids.returning.add(p.basicInfo.id);
    });

    const slotOfId = new Map(
        ctx.participants.map((p, i) => [p.basicInfo.id, i] as const)
    );

    const stepped = ctx.participants.map((p) => {
        const { actLastNext, actLastSlot, oopsPenalty } = wfrpState(p);

        if (!actLastNext && actLastSlot === undefined && !oopsPenalty) return p;

        const id = p.basicInfo.id;

        return withWfrpState(p, {
            actLastNext: undefined,
            actLastSlot: ids.flagged.has(id)
                ? (actLastSlot ?? slotOfId.get(id))
                : undefined,
            oopsPenalty: oopsPenalty === 'next' ? 'now' : undefined,
        });
    });

    if (!ids.flagged.size && !ids.returning.size)
        return { participants: stepped, messages: [] };

    const moved = (id: string) => ids.flagged.has(id) || ids.returning.has(id);

    const order = stepped.filter((p) => !moved(p.basicInfo.id));

    const returning = ctx.participants
        .filter((p) => ids.returning.has(p.basicInfo.id))
        .map((p) => ({
            p: stepped.find((q) => q.basicInfo.id === p.basicInfo.id) ?? p,
            slot: wfrpState(p).actLastSlot ?? 0,
        }))
        .sort((a, b) => a.slot - b.slot);

    returning.forEach(({ p, slot }) =>
        order.splice(Math.min(slot, order.length), 0, p)
    );

    return {
        participants: [
            ...order,
            ...stepped.filter((p) => ids.flagged.has(p.basicInfo.id)),
        ],
        messages: [],
    };
};
