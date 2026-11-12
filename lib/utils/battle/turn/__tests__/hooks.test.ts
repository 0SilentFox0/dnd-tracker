import { describe, expect, it } from 'vitest';

import { runTurnHooks } from '../hooks';

import { D6POOL_SYSTEM } from '@/lib/__tests__/fixtures/d6pool/definition';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { applyDamageConsequences } from '@/lib/utils/battle/damage/consequences';
import { DEFAULT_RULES } from '@/lib/utils/rules/defaults';
import { composeSystem } from '@/lib/utils/rules/systems/compose';
import type {
    TurnHook,
    TurnHookCtx,
    TurnStartCtx,
} from '@/lib/utils/rules/systems/types';

const note =
    (text: string, extra: Partial<ReturnType<TurnHook>> = {}): TurnHook =>
    (ctx) => ({ participants: ctx.participants, messages: [text], ...extra });

const ctx: TurnHookCtx = {
    participants: [],
    round: 1,
    rng: () => 0.5,
    rules: DEFAULT_RULES,
};

describe('runTurnHooks', () => {
    it('runs the hooks in list order and concatenates their messages', () => {
        expect(
            runTurnHooks([note('a'), note('b'), note('c')], ctx).messages
        ).toEqual(['a', 'b', 'c']);
    });

    it('an empty list changes nothing', () => {
        expect(runTurnHooks([], ctx)).toEqual({
            participants: [],
            messages: [],
        });
    });

    it('each hook sees the participants the previous one returned', () => {
        const p = createMockParticipant();

        const add: TurnHook = (c) => ({
            participants: [...c.participants, p],
            messages: [],
        });

        const count: TurnHook = (c) => ({
            participants: c.participants,
            messages: [`seen ${c.participants.length}`],
        });

        const r = runTurnHooks([add, count], ctx);

        expect(r.participants).toEqual([p]);
        expect(r.messages).toEqual(['seen 1']);
    });

    it('skipTurn ends the list after that hook', () => {
        const r = runTurnHooks(
            [note('a'), note('b', { skipTurn: true }), note('c')],
            ctx
        );

        expect(r.messages).toEqual(['a', 'b']);
        expect(r.skipTurn).toBe(true);
    });

    it('pending ends the list after that hook', () => {
        const r = runTurnHooks([note('a', { pending: true }), note('b')], ctx);

        expect(r.messages).toEqual(['a']);
        expect(r.pending).toBe(true);
    });

    it('collects actions, downed and testerIds of all hooks', () => {
        const r = runTurnHooks(
            [
                note('a', { downed: true, testerIds: ['x'] }),
                note('b', { testerIds: ['y'] }),
            ],
            ctx
        );

        expect(r.downed).toBe(true);
        expect(r.testerIds).toEqual(['x', 'y']);
        expect(r.actions).toBeUndefined();
    });
});

describe('composed turn lists', () => {
    const base = {
        id: 'base',
        build: () => ({ combat: { turn: { onTurnStart: [note('base')] } } }),
    };

    const plus = {
        id: 'd6pool-plus',
        build: () => ({ combat: { turn: { onTurnStart: [note('plus')] } } }),
    };

    const startCtx: TurnStartCtx = {
        ...ctx,
        id: 'x',
        applyDamage: applyDamageConsequences,
    };

    it("base hooks run first, then the module's", () => {
        const system = composeSystem(D6POOL_SYSTEM, [base, plus]);

        expect(
            runTurnHooks(system.combat.turn?.onTurnStart ?? [], startCtx)
                .messages
        ).toEqual(['base', 'plus']);
    });

    it("the module's hook runs on its own too", () => {
        const system = composeSystem(D6POOL_SYSTEM, [plus]);

        expect(
            runTurnHooks(system.combat.turn?.onTurnStart ?? [], startCtx)
                .messages
        ).toEqual(['plus']);
    });
});
