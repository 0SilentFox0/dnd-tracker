import { describe, expect, it } from 'vitest';

import { bookExample } from './book-example';

import { RulesetSchema } from '@/lib/utils/rules/schema';
import {
    type Characteristics,
    DEFAULT_CHARACTERISTICS,
} from '@/systems/wfrp/rules/characteristics';
import { planGrant } from '@/systems/wfrp/rules/corruption/plan-grant';
import { corruptionSpeciesOf } from '@/systems/wfrp/rules/corruption/species';
import type { Mutation } from '@/systems/wfrp/rules/corruption/types';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';

const rulesOf = (preset: 'legacy' | 'canon5e') =>
    RulesetSchema.parse({ ...WFRP_RULES, edition: { preset } });

const canon = rulesOf('canon5e');

const legacy = rulesOf('legacy');

const mutation = (kind: Mutation['kind'], id: string): Mutation => ({
    id,
    at: '2026-01-01T00:00:00.000Z',
    kind,
    roll: 1,
    text: 'x',
    effects: [],
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
    presets: Parameters<typeof planGrant>[0]['presets'],
    rules: ReturnType<typeof rulesOf> = canon,
    species?: Parameters<typeof planGrant>[0]['species']
) =>
    planGrant({
        characteristics: c,
        rules,
        points,
        reason: 'why',
        rng: () => 0.5,
        id: 'g1',
        at: '2026-02-02T00:00:00.000Z',
        presets,
        species,
    });

const fail = { test: 99, type: 10, row: 1 };

describe('canon5e corruption', () => {
    bookExample(
        188,
        'a failed Endurance test costs WPB Corruption Points',
        () => {
            const c = withState(6);

            const { state, summary } = run(c, 2, fail);

            expect(summary.mutation?.kind).toBe('physical');
            expect(summary.total).toBe(8);
            expect(summary.pointsLost).toBe(3);
            expect(state.points).toBe(5);
            expect(state.last?.after.points).toBe(5);
        }
    );

    bookExample(
        188,
        'a passed test keeps the points and adds no mutation',
        () => {
            const { state, summary } = run(withState(6), 2, { test: 3 });

            expect(summary.pointsLost).toBeUndefined();
            expect(state.points).toBe(8);
            expect(state.mutations).toEqual([]);
        }
    );

    bookExample(188, 'no test while within WPB + TB', () => {
        const { summary } = run(withState(0), 6, {});

        expect(summary.test).toBeUndefined();
    });

    bookExample(188, 'the Body/Mind split follows the species', () => {
        const mind = { test: 99, type: 20, row: 1 };

        expect(
            run(withState(6), 1, mind, canon, 'human').summary.mutation?.kind
        ).toBe('physical');
        expect(
            run(withState(6), 1, mind, canon, 'halfling').summary.mutation?.kind
        ).toBe('mental');
        expect(
            run(withState(6), 1, { ...mind, type: 5 }, canon, 'dwarf').summary
                .mutation?.kind
        ).toBe('physical');
        expect(
            run(withState(6), 1, { ...mind, type: 1 }, canon, 'elf').summary
                .mutation?.kind
        ).toBe('mental');
    });

    bookExample(188, 'more physical mutations than TB loses the soul', () => {
        const owned = [
            mutation('physical', 'a'),
            mutation('physical', 'b'),
            mutation('physical', 'c'),
        ];

        const { summary } = run(withState(6, owned), 1, fail);

        expect(summary.soulLost).toBe('physical');
    });

    bookExample(188, 'at the limit the soul holds', () => {
        const owned = [mutation('physical', 'a'), mutation('physical', 'b')];

        expect(
            run(withState(6, owned), 1, fail).summary.soulLost
        ).toBeUndefined();
    });

    bookExample(188, 'more mental mutations than WPB loses the soul', () => {
        const owned = [
            mutation('mental', 'a'),
            mutation('mental', 'b'),
            mutation('mental', 'c'),
        ];

        const { summary } = run(withState(6, owned), 1, {
            ...fail,
            type: 90,
        });

        expect(summary.soulLost).toBe('mental');
    });
});

describe('legacy corruption is unchanged', () => {
    it('keeps the points and ignores the soul limit', () => {
        const owned = [
            mutation('physical', 'a'),
            mutation('physical', 'b'),
            mutation('physical', 'c'),
        ];

        const { state, summary } = run(withState(6, owned), 2, fail, legacy);

        expect(state.points).toBe(8);
        expect(summary.pointsLost).toBeUndefined();
        expect(summary.soulLost).toBeUndefined();
    });
});

describe('corruption species', () => {
    it('maps race names to canon species', () => {
        expect(corruptionSpeciesOf({ name: 'Wood Elf' })).toBe('elf');
        expect(corruptionSpeciesOf({ name: 'Halfling' })).toBe('halfling');
        expect(corruptionSpeciesOf({ slug: 'dwarf', name: 'x' })).toBe('dwarf');
        expect(corruptionSpeciesOf({ name: 'Reiklander' })).toBe('human');
        expect(corruptionSpeciesOf(null)).toBe('human');
    });
});
