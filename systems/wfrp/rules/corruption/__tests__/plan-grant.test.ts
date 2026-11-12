import { describe, expect, it } from 'vitest';

import { planGrant } from '../plan-grant';
import type { Mutation, MutationEffect } from '../types';

import { dynamicTextRef } from '@/lib/i18n/text-ref';
import {
    type Characteristics,
    DEFAULT_CHARACTERISTICS,
} from '@/systems/wfrp/rules/characteristics';

const rng = () => 0.5;

const mutation = (id: string, effects: MutationEffect[] = []): Mutation => ({
    id,
    at: '2026-01-01T00:00:00.000Z',
    kind: 'physical',
    roll: 1,
    text: 'x',
    effects,
});

const withState = (
    points: number,
    mutations: Mutation[] = []
): Characteristics => ({
    ...DEFAULT_CHARACTERISTICS,
    corruption: { points, mutations },
});

const run = (
    c: Characteristics,
    points: number,
    presets = {},
    rules: Parameters<typeof planGrant>[0]['rules'] = { tables: {} }
) =>
    planGrant({
        characteristics: c,
        rules,
        points,
        reason: 'why',
        rng,
        id: 'g1',
        at: '2026-02-02T00:00:00.000Z',
        presets,
    });

describe('planGrant', () => {
    it('stays under the threshold without a test', () => {
        const { state, summary } = run(withState(0), 5);

        expect(summary).toEqual({ points: 5, total: 5, threshold: 6 });
        expect(state.points).toBe(5);
        expect(state.mutations).toEqual([]);
        expect(state.last).toEqual({
            id: 'g1',
            at: '2026-02-02T00:00:00.000Z',
            reason: 'why',
            before: { points: 0 },
            after: { points: 5 },
            summary,
        });
    });

    it('does not test exactly on the threshold', () => {
        expect(run(withState(1), 5).summary.test).toBeUndefined();
    });

    it('a passed test adds no mutation', () => {
        const { state, summary } = run(withState(6), 1, { test: 25 });

        expect(summary.test?.outcome).toBe('success');
        expect(summary.mutation).toBeUndefined();
        expect(state.mutations).toEqual([]);
        expect(state.last?.after.mutationId).toBeUndefined();
    });

    it('a failed test adds a mutation from the default table', () => {
        const { state, summary } = run(withState(6), 1, {
            test: 90,
            type: 50,
            row: 1,
        });

        expect(summary.mutation).toMatchObject({
            kind: 'physical',
            typeRoll: 50,
            roll: 1,
            text: dynamicTextRef('wfrpCorruption.mutations.physical.1'),
            effects: [{ type: 'characteristic', key: 'ag', amount: -5 }],
        });
        expect(state.mutations.at(-1)).toEqual({
            id: 'g1',
            at: '2026-02-02T00:00:00.000Z',
            kind: 'physical',
            roll: 1,
            text: dynamicTextRef('wfrpCorruption.mutations.physical.1'),
            effects: [{ type: 'characteristic', key: 'ag', amount: -5 }],
        });
        expect(state.last?.after.mutationId).toBe('g1');
    });

    it('type roll 51 is mental', () => {
        expect(
            run(withState(6), 1, { test: 90, type: 51, row: 1 }).summary
                .mutation?.kind
        ).toBe('mental');
    });

    it('uses a custom table and copies its effects', () => {
        const effects: MutationEffect[] = [
            { type: 'characteristic', key: 'wp', amount: -5 },
        ];

        const rules = {
            tables: {
                mutationMental: [{ max: 100, text: 'Whispers', effects }],
            },
        };

        const { state } = run(withState(6), 1, { test: 90, type: 80 }, rules);

        effects[0] = { type: 'move', amount: -1 };

        expect(state.mutations[0]).toMatchObject({
            text: 'Whispers',
            effects: [{ type: 'characteristic', key: 'wp', amount: -5 }],
        });
    });

    it('tests again after a mutation', () => {
        const { summary } = run(withState(7, [mutation('a')]), 1, { test: 25 });

        expect(summary.test).toBeDefined();
    });

    it('uses the modified threshold and effective Toughness', () => {
        const c = withState(4, [
            mutation('a', [{ type: 'characteristic', key: 't', amount: -10 }]),
        ]);

        const { summary } = run(c, 2, { test: 25 });

        expect(summary).toMatchObject({ total: 6, threshold: 5 });
        expect(summary.test).toMatchObject({ target: 20, outcome: 'failure' });
    });

    it('caps at 20 mutations', () => {
        const list = Array.from({ length: 20 }, (_, i) => mutation(`m${i}`));

        const { state, summary } = run(withState(7, list), 1, { test: 90 });

        expect(summary.capped).toBe(true);
        expect(summary.mutation).toBeUndefined();
        expect(state.mutations).toHaveLength(20);
        expect(state.points).toBe(8);
    });

    it('caps points at 999', () => {
        const { state, summary } = run(withState(995), 10, { test: 25 });

        expect(state.points).toBe(999);
        expect(summary).toMatchObject({ total: 999, pointsCapped: true });
    });

    it('an invalid stored section falls back to the default row', async () => {
        const { parseRules } = await import('@/lib/utils/rules/schema');

        const rules = parseRules({
            tables: { mutationPhysical: [{ max: 50, effects: [] }] },
        });

        expect(
            run(withState(6), 1, { test: 90, type: 1, row: 1 }, rules).summary
                .mutation?.text
        ).toEqual(dynamicTextRef('wfrpCorruption.mutations.physical.1'));
    });
});
