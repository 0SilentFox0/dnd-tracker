import { describe, expect, it } from 'vitest';

import { createCritGate } from '../gate';
import { runWithCritChoice } from '../run-with-crit-choice';
import type { NegateInfo } from '../types';

import { context } from '@/lib/server/battles/__tests__/mutations/fixtures';
import { makeParticipant, seq } from '@/lib/utils/abilities/__tests__/fixtures';
import type { MutationResult } from '@/lib/utils/battle/pipeline/run-battle-mutation';

const info = (id: string): NegateInfo => ({
    holder: makeParticipant({ id }),
    actorId: 'att',
    cost: 'cost.key',
});

describe('negate gate', () => {
    it('keys are stable per holder across two targets', () => {
        const gate = createCritGate({ rng: seq(0.5) });

        gate.pick.negate?.(info('a'));
        gate.pick.negate?.(info('b'));
        gate.pick.negate?.(info('a'));

        expect(gate.negations.map((o) => o.key)).toEqual([
            'negate:a:0',
            'negate:b:0',
            'negate:a:1',
        ]);
        expect(gate.negations[0]).toEqual({
            key: 'negate:a:0',
            holderId: 'a',
            actorId: 'att',
            cost: 'cost.key',
        });
    });

    it('declines without a choice and accepts with one, never touching rng', () => {
        const rng = () => {
            throw new Error('rng used');
        };

        const none = createCritGate({ rng });

        expect(none.pick.negate?.(info('a'))).toBe(false);

        const yes = createCritGate({
            rng,
            negateChoices: { 'negate:a:0': true },
        });

        expect(yes.pick.negate?.(info('a'))).toBe(true);
    });
});

describe('runWithCritChoice negations', () => {
    const ctx = context();

    const done = (): MutationResult => ({
        participants: ctx.participants,
        pending: ctx.pending,
        events: [{ type: 'attack', round: 1, resultText: 'ok' }],
    });

    const run = ({
        crit,
    }: {
        crit: { negate?: (i: NegateInfo) => boolean };
    }) => {
        crit.negate?.(info('a'));

        return done();
    };

    const opts = {
        action: 'attack' as const,
        actorId: 'att',
        request: { attackerId: 'att' },
        enabled: true,
        run,
    };

    it('pauses with empty triggers and the negation offers', async () => {
        const out = await runWithCritChoice(ctx, opts);

        const shown = out.scene?.pendingChoice?.shown as {
            triggers: unknown[];
            negations: { key: string }[];
        };

        expect(out.events).toEqual([]);
        expect(shown.triggers).toEqual([]);
        expect(shown.negations.map((o) => o.key)).toEqual(['negate:a:0']);
    });

    it('resume with a choice clears the pending choice', async () => {
        const paused = await runWithCritChoice(ctx, opts);

        const seed = (paused.scene?.pendingChoice?.hidden as { seed: number })
            .seed;

        const out = await runWithCritChoice(ctx, {
            ...opts,
            resume: {
                seed,
                choices: {},
                negateChoices: { 'negate:a:0': true },
            },
        });

        expect(out.scene?.pendingChoice).toBeNull();
        expect(out.events).toHaveLength(1);
    });
});
