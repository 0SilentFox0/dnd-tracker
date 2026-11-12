import { describe, expect, it } from 'vitest';

import { type CreationCtx, type CreationPicks, planDraft } from '../plan';
import { parseProfile } from '../schema';

import { DEFAULT_ADVANCEMENT_RULES } from '@/systems/wfrp/rules/advancement/rules';

const profile = parseProfile({
    mods: { ws: 5, fel: -10 },
    move: 3,
    fate: 2,
    extraWounds: 1,
    talents: ['fixed'],
    randomTalentCount: 2,
    randomTalents: [
        { max: 50, featId: 'r1' },
        { max: 100, featId: 'r2' },
    ],
    careerTable: [
        { max: 50, careerId: 'c1' },
        { max: 100, careerId: 'c2' },
    ],
});

const ctx: CreationCtx = {
    profile,
    rules: DEFAULT_ADVANCEMENT_RULES,
    careerIds: new Set(['c1', 'c2', 'c3']),
    featIds: new Set(['fixed', 'r1', 'r2']),
};

const rolls = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const rolled: CreationPicks = {
    career: { mode: 'rolled', careerId: 'c1' },
    stats: { mode: 'rolled', rolls },
    talents: [],
};

const errorsOf = (picks: CreationPicks, c: CreationCtx = ctx) => {
    const r = planDraft(picks, c);

    return r.ok ? [] : r.errors;
};

describe('planDraft', () => {
    it('rolled: applies mods, species fields, career, fixed talent and bonuses', () => {
        const r = planDraft(rolled, ctx);

        if (!r.ok) throw new Error(r.errors.join());

        expect(r.characteristics.base).toEqual({
            ws: 27,
            bs: 23,
            s: 24,
            t: 25,
            i: 26,
            ag: 27,
            dex: 28,
            int: 29,
            wp: 30,
            fel: 21,
        });
        expect(r.characteristics.move).toBe(3);
        expect(r.characteristics.fate).toBe(2);
        expect(r.characteristics.extraWounds).toBe(1);
        expect(r.characteristics.career).toEqual({
            careerId: 'c1',
            tier: 1,
            ticks: [],
        });
        expect(r.characteristics.talents).toEqual({ fixed: 1 });
        expect(r.experience).toBe(100);
    });

    it('rearranged: uses the arranged order, 25+25 xp for choice', () => {
        const arranged = [...rolls].reverse();

        const r = planDraft(
            {
                career: { mode: 'choice', careerId: 'c2' },
                stats: { mode: 'rearranged', rolls, arranged },
                talents: [],
            },
            ctx
        );

        if (!r.ok) throw new Error(r.errors.join());

        expect(r.characteristics.base.ws).toBe(20 + 5 + 11);
        expect(r.characteristics.base.fel).toBe(20 - 10 + 2);
        expect(r.experience).toBe(50);
    });

    it('free: points from budget, any known career, 0 xp', () => {
        const points = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10];

        const r = planDraft(
            {
                career: { mode: 'free', careerId: 'c3' },
                stats: { mode: 'free', points },
                talents: [],
            },
            ctx
        );

        if (!r.ok) throw new Error(r.errors.join());

        expect(r.characteristics.base.ws).toBe(35);
        expect(r.characteristics.career?.careerId).toBe('c3');
        expect(r.experience).toBe(0);
    });

    it('stacks chosen random talents and caps ranks at 20', () => {
        const r = planDraft(
            { ...rolled, talents: ['r1', 'fixed'] },
            {
                ...ctx,
                profile: {
                    ...profile,
                    randomTalents: [
                        ...profile.randomTalents,
                        { max: 100, featId: 'fixed' },
                    ],
                },
            }
        );

        if (!r.ok) throw new Error(r.errors.join());

        expect(r.characteristics.talents).toEqual({ fixed: 2, r1: 1 });

        const many = {
            ...profile,
            talents: Array(20).fill('fixed'),
            randomTalentCount: 1,
            randomTalents: [{ max: 100, featId: 'fixed' }],
        };

        const capped = planDraft(
            { ...rolled, talents: ['fixed'] },
            { ...ctx, profile: many }
        );

        if (!capped.ok) throw new Error(capped.errors.join());

        expect(capped.characteristics.talents.fixed).toBe(20);
    });

    it('reports PROFILE_NOT_READY for an empty profile', () => {
        expect(errorsOf(rolled, { ...ctx, profile: parseProfile({}) })).toEqual(
            ['PROFILE_NOT_READY']
        );
    });

    it('career errors', () => {
        expect(
            errorsOf({ ...rolled, career: { mode: 'choice', careerId: 'c3' } })
        ).toEqual(['CAREER_NOT_IN_TABLE']);
        expect(
            errorsOf({ ...rolled, career: { mode: 'rolled', careerId: 'c3' } })
        ).toEqual(['CAREER_NOT_IN_TABLE']);
        expect(
            errorsOf({ ...rolled, career: { mode: 'free', careerId: 'zzz' } })
        ).toEqual(['CAREER_UNKNOWN']);
        expect(
            errorsOf(rolled, { ...ctx, careerIds: new Set(['c2']) })
        ).toEqual(['CAREER_UNKNOWN']);
        expect(
            errorsOf(
                { ...rolled, career: { mode: 'choice', careerId: 'c1' } },
                { ...ctx, careerIds: new Set(['c2']) }
            )
        ).toEqual(['CAREER_UNKNOWN']);
    });

    it('stat errors', () => {
        expect(
            errorsOf({ ...rolled, stats: { mode: 'rolled', rolls: [2, 3] } })
        ).toEqual(['STATS_LENGTH']);
        expect(
            errorsOf({
                ...rolled,
                stats: { mode: 'rolled', rolls: [1, ...rolls.slice(1)] },
            })
        ).toEqual(['STATS_RANGE']);
        expect(
            errorsOf({
                ...rolled,
                stats: { mode: 'rolled', rolls: [21, ...rolls.slice(1)] },
            })
        ).toEqual(['STATS_RANGE']);
        expect(
            errorsOf({
                ...rolled,
                stats: {
                    mode: 'rearranged',
                    rolls,
                    arranged: [12, ...rolls.slice(1)],
                },
            })
        ).toEqual(['STATS_NOT_PERMUTATION']);
        expect(
            errorsOf({
                ...rolled,
                stats: { mode: 'rearranged', rolls, arranged: rolls.slice(1) },
            })
        ).toEqual(['STATS_LENGTH']);
    });

    it('points errors', () => {
        const free = (points: number[]): CreationPicks => ({
            ...rolled,
            career: { mode: 'free', careerId: 'c1' },
            stats: { mode: 'free', points },
        });

        expect(errorsOf(free([10, 10, 10, 10, 10, 10, 10, 10, 10, 9]))).toEqual(
            ['POINTS_BUDGET']
        );
        expect(errorsOf(free([3, 11, 10, 10, 10, 10, 10, 10, 10, 16]))).toEqual(
            ['POINTS_RANGE']
        );
        expect(
            errorsOf(free([19, 1, 10, 10, 10, 10, 10, 10, 10, 20]))
        ).toContain('POINTS_RANGE');
        expect(errorsOf(free([10]))).toEqual(['STATS_LENGTH']);
    });

    it('talent errors', () => {
        expect(errorsOf({ ...rolled, talents: ['fixed'] })).toEqual([
            'TALENT_NOT_IN_TABLE',
        ]);
        expect(errorsOf({ ...rolled, talents: ['r1', 'r1', 'r2'] })).toEqual([
            'TALENT_COUNT',
        ]);
        expect(errorsOf(rolled, { ...ctx, featIds: new Set(['r1']) })).toEqual([
            'FEAT_UNKNOWN',
        ]);
    });
});
