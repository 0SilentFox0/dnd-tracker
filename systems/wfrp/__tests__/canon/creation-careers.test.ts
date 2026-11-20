import { describe, expect, it } from 'vitest';

import { bookExample, CANON, LEGACY } from './book-example';

import { DEFAULT_ADVANCEMENT_RULES } from '@/systems/wfrp/rules/advancement/defaults';
import { planPurchase } from '@/systems/wfrp/rules/advancement/plan';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import {
    CAREER_ROLLS,
    rollCreation,
    type SpeciesProfile,
} from '@/systems/wfrp/rules/creation';

const profile: SpeciesProfile = {
    mods: {},
    move: 4,
    fate: 2,
    extraWounds: 0,
    talents: [],
    randomTalentCount: 0,
    randomTalents: [],
    careerTable: Array.from({ length: 10 }, (_, i) => ({
        max: (i + 1) * 10,
        careerId: `c${i}`,
    })),
};

const seeded = (seed: number) => {
    let s = seed;

    return () => {
        s = (s * 16807) % 2147483647;

        return (s - 1) / 2147483646;
    };
};

const tier = (o: { skills?: string[]; talents?: string[] }) => ({
    name: 'T',
    characteristics: [],
    skills: o.skills ?? [],
    talents: o.talents ?? [],
    trappings: [],
});

const career = {
    state: { careerId: 'x', tier: 1 as const, ticks: [] },
    tiers: [tier({ skills: ['melee:basic', 'heal'], talents: ['t-in'] })],
};

const buy = (kind: 'skill' | 'talent', key: string, careerOnly: boolean) =>
    planPurchase({
        characteristics: DEFAULT_CHARACTERISTICS,
        available: 5000,
        rules: DEFAULT_ADVANCEMENT_RULES,
        request: { kind, key },
        talent: { id: key, xpCost: 100, maxRank: 1 },
        career,
        careerOnly,
        now: '2026-11-21T00:00:00.000Z',
        id: 'e1',
    });

describe('canon: career rolls (p36)', () => {
    bookExample(
        36,
        'canon5e offers three distinct careers to choose from',
        () => {
            for (let seed = 1; seed <= 20; seed++) {
                const { careerRolls } = rollCreation(
                    seeded(seed),
                    profile,
                    CAREER_ROLLS[CANON.creationMode]
                );

                expect(careerRolls).toHaveLength(3);
                expect(new Set(careerRolls.map((r) => r.careerId)).size).toBe(
                    3
                );
            }
        }
    );

    bookExample(36, 'a rolled career keeps only the first of the rolls', () => {
        const { careerRolls } = rollCreation(seeded(7), profile, 3);

        expect(careerRolls[0]).toBeDefined();
    });

    it('legacy keeps two career rolls', () => {
        expect(CAREER_ROLLS[LEGACY.creationMode]).toBe(2);
        expect(rollCreation(seeded(3), profile).careerRolls).toHaveLength(2);
    });
});

describe('canon: out-of-career advances (p44, p197)', () => {
    bookExample(197, 'an advanced skill outside the career is refused', () => {
        const res = buy('skill', 'research', true);

        expect(res).toEqual({ ok: false, error: 'ADVANCE_OUT_OF_CAREER' });
    });

    bookExample(197, 'the same advanced skill in the career is bought', () => {
        const res = buy('skill', 'heal', true);

        expect(res.ok).toBe(true);
    });

    bookExample(44, 'a basic skill outside the career is bought at 2x', () => {
        const inCareer = planPurchase({
            characteristics: DEFAULT_CHARACTERISTICS,
            available: 5000,
            rules: DEFAULT_ADVANCEMENT_RULES,
            request: { kind: 'skill', key: 'melee:basic' },
            career,
            careerOnly: true,
            now: '2026-11-21T00:00:00.000Z',
            id: 'e1',
        });

        const out = buy('skill', 'athletics', true);

        expect(inCareer.ok && out.ok).toBe(true);

        if (inCareer.ok && out.ok)
            expect(out.entry.cost).toBe(
                Math.round(
                    inCareer.entry.cost *
                        DEFAULT_ADVANCEMENT_RULES.career.outOfCareerMultiplier
                )
            );
    });

    bookExample(199, 'a talent outside the career is refused', () => {
        expect(buy('talent', 't-out', true)).toEqual({
            ok: false,
            error: 'ADVANCE_OUT_OF_CAREER',
        });

        expect(buy('talent', 't-in', true).ok).toBe(true);
    });

    it('legacy buys any out-of-career skill or talent at the multiplier', () => {
        expect(buy('skill', 'research', false).ok).toBe(true);
        expect(buy('talent', 't-out', false).ok).toBe(true);
    });
});
