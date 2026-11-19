import type { CounterOffer,HiddenCounter, ShownCounter } from './types';

import { COUNTER_WINDOW_MS } from '@/lib/constants/battle';
import type { SpellRequestData } from '@/lib/schemas/battles';
import type { MutationResult } from '@/lib/utils/battle/pipeline/run-battle-mutation';
import type { PendingChoice } from '@/lib/utils/battle/store/types';
import type { BattleParticipant } from '@/types/battle';

export interface CounterPending {
    shown: ShownCounter;
    hidden: HiddenCounter;
}

export const asShownCounter = (raw: unknown): ShownCounter | null => {
    const shown = raw as Partial<ShownCounter> | null | undefined;

    return shown && typeof shown === 'object' && shown.kind === 'counter'
        ? (shown as ShownCounter)
        : null;
};

export const counterPendingOf = (
    p: PendingChoice | null | undefined
): CounterPending | null =>
    p && asShownCounter(p.shown) ? (p as CounterPending) : null;

export const allAnswered = (shown: ShownCounter): boolean =>
    shown.offers.every((o) => o.answer !== undefined);

export const counterDeadline = (now: number): string =>
    new Date(now + COUNTER_WINDOW_MS).toISOString();

export function openCounterWindow(
    ctx: {
        participants: BattleParticipant[];
        pending: BattleParticipant[];
        userId: string;
        isDM: boolean;
    },
    args: {
        caster: BattleParticipant;
        spell: { name: string; level: number };
        offers: CounterOffer[];
        request: SpellRequestData;
        serverRolls: boolean;
        now: number;
        seed: number;
    }
): MutationResult {
    return {
        participants: ctx.participants,
        pending: ctx.pending,
        events: [],
        scene: {
            pendingChoice: {
                shown: {
                    kind: 'counter',
                    windowId: crypto.randomUUID(),
                    actorId: args.caster.basicInfo.id,
                    spell: args.spell,
                    deadline: counterDeadline(args.now),
                    offers: args.offers,
                } satisfies ShownCounter,
                hidden: {
                    request: args.request,
                    seed: args.seed,
                    ...(args.serverRolls && { serverRolls: true }),
                    userId: ctx.userId,
                    isDM: ctx.isDM,
                    attempts: 0,
                } satisfies HiddenCounter,
            },
        },
        response: { pendingChoice: true },
    };
}

/** Players never learn the spell being cast or which DM-controlled reactors may answer */
export function redactCounterForPlayers(shown: ShownCounter): ShownCounter {
    const { spell: _spell, ...rest } = shown;

    const offers = shown.offers.filter((o) => !o.dm);

    return {
        ...rest,
        offers,
        ...(offers.length < shown.offers.length && { dmDeciding: true }),
    };
}

export function redactPendingForPlayers(shown: unknown): unknown {
    const counter = asShownCounter(shown);

    return counter ? redactCounterForPlayers(counter) : shown;
}
