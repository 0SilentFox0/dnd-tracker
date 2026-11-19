import { API_ERRORS } from '@/lib/constants/api-errors';
import { textRef } from '@/lib/i18n/text-ref';
import type { CounterWindowBody, SpellRequestData } from '@/lib/schemas/battles';
import { createSpellMutation } from '@/lib/server/battles/mutations/spell/spell-mutation';
import { findParticipant } from '@/lib/utils/abilities/engine/core/participants';
import {
    allAnswered,
    counterDeadline,
    type CounterPending,
    counterPendingOf,
} from '@/lib/utils/battle/counter/pending';
import type { CounterOffer } from '@/lib/utils/battle/counter/types';
import {
    type BattleMutationContext,
    BattleOperationError,
    type MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { resolveChosenSlot } from '@/lib/utils/battle/spell/slot';
import {
    actorEvent,
    BattleAccessError,
    BattleRuleError,
    systemEvent,
} from '@/lib/utils/battle/store';
import type { NewBattleEvent } from '@/lib/utils/battle/store/types';
import { mulberry32 } from '@/lib/utils/common/rng';
import { slotLevel, slotRestoreOrder } from '@/lib/utils/spells/slot-keys';
import type { BattleParticipant } from '@/types/battle';

type SpellOptions = Parameters<typeof createSpellMutation>[1];

type SpellRunner = ReturnType<typeof createSpellMutation>;

export interface CounterWindowDeps {
    spell?: (options: SpellOptions) => SpellRunner;
    now?: () => number;
}

const EXPIRE_SKEW_MS = 250;

const stale = () =>
    new BattleOperationError(409, API_ERRORS.COUNTER_WINDOW_STALE);

const forbidden = () => new BattleAccessError(403, API_ERRORS.FORBIDDEN);

function slotKeyFor(reactor: BattleParticipant, level: number) {
    const slots = reactor.spellcasting.spellSlots ?? {};

    return slotRestoreOrder(slots).find(
        (key) =>
            slotLevel(slots, key) === level &&
            resolveChosenSlot(reactor, level, key).ok
    );
}

function counterRequest(
    offer: CounterOffer,
    reactor: BattleParticipant,
    actorId: string,
    slotLevelChoice: number | undefined
): SpellRequestData {
    const base = {
        casterId: offer.reactorId,
        spellId: offer.spellId,
        targetIds: [actorId],
        diceRolls: [],
    };

    if (offer.slotLevels.length === 0)
        return { ...base, ...(offer.grantKey && { grantKey: offer.grantKey }) };

    const level = slotLevelChoice ?? offer.slotLevels[0];

    const slotKey = offer.slotLevels.includes(level)
        ? slotKeyFor(reactor, level)
        : undefined;

    if (!slotKey)
        throw new BattleRuleError('action_rejected', API_ERRORS.SLOT_MISSING);

    return { ...base, slotKey };
}

export function createCounterWindowMutation(deps: CounterWindowDeps = {}) {
    const spellRunner =
        deps.spell ?? ((options: SpellOptions) => createSpellMutation(undefined, options));

    const now = deps.now ?? Date.now;

    const withPending = (
        base: MutationResult,
        pending: CounterPending
    ): MutationResult => ({
        ...base,
        scene: { ...base.scene, pendingChoice: pending },
    });

    async function close(
        ctx: BattleMutationContext,
        pending: CounterPending,
        base: Pick<MutationResult, 'participants' | 'pending'> & {
            events: NewBattleEvent[];
            response?: Record<string, unknown>;
        },
        outcome: { countered: string } | { resolve: true }
    ): Promise<MutationResult> {
        const { hidden } = pending;

        const requesterCtx: BattleMutationContext = {
            ...ctx,
            participants: base.participants,
            pending: base.pending,
            userId: hidden.userId,
            isDM: hidden.isDM,
        };

        const run = spellRunner({
            serverRolls: hidden.serverRolls,
            skipCounter: true,
        });

        try {
            const replayed = await run(requesterCtx, hidden.request, undefined, {
                seed: hidden.seed,
                ...('countered' in outcome && {
                    counteredBy: outcome.countered,
                }),
            });

            return {
                ...replayed,
                events: [...base.events, ...replayed.events],
                response: { ...base.response, ...replayed.response },
                scene: {
                    ...replayed.scene,
                    pendingChoice: replayed.scene?.pendingChoice ?? null,
                },
            };
        } catch (err) {
            if (!(err instanceof BattleRuleError)) throw err;

            return {
                participants: base.participants,
                pending: base.pending,
                events: [
                    ...base.events,
                    systemEvent(
                        ctx.scene.round,
                        textRef('battleLog.counter.castFailed')
                    ),
                ],
                response: base.response,
                scene: { pendingChoice: null },
            };
        }
    }

    const closeResolve = (
        ctx: BattleMutationContext,
        pending: CounterPending,
        events: NewBattleEvent[] = []
    ) =>
        close(
            ctx,
            pending,
            { participants: ctx.participants, pending: ctx.pending, events },
            { resolve: true }
        );

    const passOpen = (pending: CounterPending): CounterPending => ({
        ...pending,
        shown: {
            ...pending.shown,
            offers: pending.shown.offers.map((o) => ({
                ...o,
                answer: o.answer ?? ('pass' as const),
            })),
        },
    });

    const answered = (
        pending: CounterPending,
        reactorId: string,
        answer: 'pass' | 'failed',
        extra: Partial<CounterPending['shown']> = {}
    ): CounterPending => ({
        shown: {
            ...pending.shown,
            ...extra,
            offers: pending.shown.offers.map((o) =>
                o.reactorId === reactorId ? { ...o, answer } : o
            ),
        },
        hidden: pending.hidden,
    });

    const answerFor = (
        ctx: BattleMutationContext,
        pending: CounterPending,
        reactorId: string
    ) => {
        const offer = pending.shown.offers.find(
            (o) => o.reactorId === reactorId
        );

        const reactor = findParticipant(ctx.participants, reactorId);

        if (!offer || offer.answer !== undefined || !reactor) throw stale();

        return { offer, reactor };
    };

    return async (
        ctx: BattleMutationContext,
        body: CounterWindowBody
    ): Promise<MutationResult> => {
        const pending = counterPendingOf(ctx.scene.pendingChoice);

        if (!pending || pending.shown.windowId !== body.windowId)
            throw stale();

        if (body.action === 'closeAll') {
            if (!ctx.isDM)
                throw new BattleAccessError(403, API_ERRORS.DM_ONLY);

            return closeResolve(ctx, pending);
        }

        if (body.action === 'expire') {
            const wait =
                new Date(pending.shown.deadline).getTime() - now();

            if (wait > EXPIRE_SKEW_MS)
                throw new BattleRuleError(
                    'action_rejected',
                    API_ERRORS.COUNTER_WINDOW_OPEN,
                    { retryAfterMs: wait }
                );

            return closeResolve(ctx, passOpen(pending), [
                systemEvent(
                    ctx.scene.round,
                    textRef('battleLog.counter.expired')
                ),
            ]);
        }

        const { offer, reactor } = answerFor(ctx, pending, body.reactorId);

        const controls = reactor.basicInfo.controlledBy === ctx.userId;

        if (body.action === 'pass') {
            if (!ctx.isDM && !controls) throw forbidden();

            const next = answered(pending, body.reactorId, 'pass');

            const events = offer.dm
                ? []
                : [
                      actorEvent(
                          ctx.scene.round,
                          reactor,
                          textRef('battleLog.counter.passed', {
                              name: reactor.basicInfo.name,
                          })
                      ),
                  ];

            return allAnswered(next.shown)
                ? closeResolve(ctx, next, events)
                : withPending(
                      {
                          participants: ctx.participants,
                          pending: ctx.pending,
                          events,
                      },
                      next
                  );
        }

        if (offer.dm ? !ctx.isDM : !controls) throw forbidden();

        const { actorId } = pending.shown;

        const cast = await spellRunner({
            critPause: false,
            skipCounter: true,
            serverRolls: true,
            rng: mulberry32(pending.hidden.seed + 1 + pending.hidden.attempts),
        })(
            ctx,
            counterRequest(offer, reactor, actorId, body.slotLevel)
        );

        const base = {
            participants: cast.participants,
            pending: cast.pending,
            events: cast.events,
        };

        const countered = !!(
            cast.response?.interruptedIds as string[] | undefined
        )?.includes(actorId);

        if (countered)
            return close(
                ctx,
                pending,
                { ...base, response: { countered: true } },
                { countered: reactor.basicInfo.name }
            );

        const caster = findParticipant(ctx.participants, actorId);

        const next = answered(pending, body.reactorId, 'failed', {
            deadline: counterDeadline(now()),
        });

        next.hidden = { ...next.hidden, attempts: pending.hidden.attempts + 1 };

        const events = [
            ...base.events,
            actorEvent(
                ctx.scene.round,
                caster ?? reactor,
                textRef('battleLog.counter.saved', {
                    caster: caster?.basicInfo.name ?? '',
                    reactor: reactor.basicInfo.name,
                })
            ),
        ];

        if (allAnswered(next.shown))
            return close(
                ctx,
                next,
                { ...base, events, response: { countered: false } },
                { resolve: true }
            );

        return withPending(
            { ...base, events, response: { countered: false } },
            next
        );
    };
}
