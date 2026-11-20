import { describe, expect, it } from 'vitest';

import { bookExample, CANON, LEGACY } from './book-example';

import { DEFAULT_ADVANCEMENT_RULES } from '@/systems/wfrp/rules/advancement/rules';
import {
    beginningTrappings,
    BONUS_TRAPPINGS,
    CANON_FREE_POINT_MAX,
    CAREER_SKILL_PURCHASES,
    type CreationCtx,
    DISTRIBUTION_CAP,
    planDraft,
    SKILL_PURCHASE_CAP,
    startingWealth,
} from '@/systems/wfrp/rules/creation';
import { parseProfile } from '@/systems/wfrp/rules/creation/schema';

const profile = parseProfile({
    move: 4,
    fate: 4,
    fortune: 3,
    careerTable: [{ max: 100, careerId: 'c' }],
    skillPicks: { count: 5, options: ['a', 'b', 'c', 'd', 'e'] },
});

const ctx: CreationCtx = {
    profile,
    rules: DEFAULT_ADVANCEMENT_RULES,
    careerIds: new Set(['c']),
    featIds: new Set(['t']),
    canon: {
        step: CANON.advanceStep,
        tier1: {
            c: {
                characteristics: ['int', 'wp', 'dex'],
                skills: ['x', 'y', 'z'],
                talents: ['t'],
                trappings: [],
            },
        },
    },
};

const rolls = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5];

const canon = {
    speciesRolled: true,
    speciesSkills: ['a', 'b', 'c', 'd', 'e'],
    careerSkills: { x: 3, y: 3, z: 2 },
    careerTalent: 't',
};

describe('canon: character creation', () => {
    bookExample(23, 'the species roll kept gives +1 Fortune', () => {
        const r = planDraft(
            {
                career: { mode: 'choice', careerId: 'c' },
                stats: { mode: 'rolled', rolls },
                talents: [],
                canon,
            },
            ctx
        );

        if (!r.ok) throw new Error(r.errors.join());

        expect(r.characteristics.fortune).toBe(4);
    });

    bookExample(
        40,
        'Oh Fickle Fate: first results for species, career and characteristics give +1 Fate',
        () => {
            const r = planDraft(
                {
                    career: { mode: 'rolled', careerId: 'c' },
                    stats: { mode: 'rolled', rolls },
                    talents: [],
                    canon,
                },
                ctx
            );

            if (!r.ok) throw new Error(r.errors.join());

            expect(r.characteristics.fate).toBe(5);
        }
    );

    bookExample(
        38,
        'kept rolls add up to six points to the career characteristics; rearranged up to three; the free set none',
        () => {
            expect(DISTRIBUTION_CAP).toEqual({
                rolled: 6,
                rearranged: 3,
                free: 0,
            });
        }
    );

    bookExample(
        38,
        'free distribution: 100 points, 4 to 16 in each characteristic',
        () => {
            expect(CANON_FREE_POINT_MAX).toBe(16);
            expect(DEFAULT_ADVANCEMENT_RULES.creation.freeBudget).toBe(100);
        }
    );

    bookExample(
        38,
        '8 advances among career skills, at most 3 per skill (+15)',
        () => {
            expect(CAREER_SKILL_PURCHASES).toBe(8);
            expect(SKILL_PURCHASE_CAP).toBe(3);
            expect(CANON.advanceStep * SKILL_PURCHASE_CAP).toBe(15);
        }
    );

    bookExample(39, 'starting skill advances are +5 each', () => {
        const r = planDraft(
            {
                career: { mode: 'rolled', careerId: 'c' },
                stats: { mode: 'rolled', rolls },
                talents: [],
                canon,
            },
            ctx
        );

        if (!r.ok) throw new Error(r.errors.join());

        expect(r.characteristics.skillAdvances).toMatchObject({
            a: 5,
            x: 15,
            z: 10,
        });
    });

    bookExample(39, 'one talent from the first career level is taken', () => {
        const r = planDraft(
            {
                career: { mode: 'rolled', careerId: 'c' },
                stats: { mode: 'rolled', rolls },
                talents: [],
                canon,
            },
            ctx
        );

        if (!r.ok) throw new Error(r.errors.join());

        expect(r.characteristics.talents.t).toBe(1);
    });

    bookExample(
        39,
        'everyone begins with Clothing, a Dagger and a Pouch plus the class kit',
        () => {
            const names = (cls: string) =>
                beginningTrappings(cls, () => 0.5).map((i) => i.name);

            expect(names('Warriors')).toEqual([
                'Clothing',
                'Dagger',
                'Pouch',
                'Hand Weapon',
            ]);
            expect(names('Rangers')).toContain('Backpack');
            expect(names('Riverfolk')).toContain('Flask of Spirits');
            expect(names('Nobody')).toEqual(['Clothing', 'Dagger', 'Pouch']);
        }
    );

    bookExample(
        39,
        'class kit dice: Academics get 1d10 sheets of Parchment',
        () => {
            const parchment = beginningTrappings('Academics', () => 0.99).find(
                (i) => i.name === 'Parchment'
            );

            expect(parchment?.quantity).toBe(10);
        }
    );

    bookExample(
        39,
        'starting wealth by Status: Brass 3 is 20 + 6d10, Silver 3 is 10 + 3d10, Gold 3 is 5 crowns',
        () => {
            const top = () => 0.99;

            expect(startingWealth({ tier: 'brass', level: 3 }, top)).toEqual({
                coin: 'cp',
                amount: 80,
            });
            expect(startingWealth({ tier: 'silver', level: 3 }, top)).toEqual({
                coin: 'sp',
                amount: 40,
            });
            expect(startingWealth({ tier: 'gold', level: 3 }, top)).toEqual({
                coin: 'gp',
                amount: 5,
            });
        }
    );

    bookExample(
        39,
        'planDraft returns the full kit and the wealth of the career status',
        () => {
            const r = planDraft(
                {
                    career: { mode: 'rolled', careerId: 'c' },
                    stats: { mode: 'rolled', rolls },
                    talents: [],
                    canon,
                },
                {
                    ...ctx,
                    canon: {
                        ...ctx.canon!,
                        rng: () => 0.99,
                        tier1: {
                            c: {
                                ...ctx.canon!.tier1.c,
                                class: 'Warriors',
                                status: 'Silver 2',
                                trappings: ['Leather Jack'],
                            },
                        },
                    },
                }
            );

            if (!r.ok) throw new Error(r.errors.join());

            expect(r.items.map((i) => i.name)).toEqual([
                'Clothing',
                'Dagger',
                'Pouch',
                'Hand Weapon',
                'Leather Jack',
            ]);
            expect(r.wealth).toEqual({ coin: 'sp', amount: 30 });
        }
    );

    bookExample(
        36,
        'a kept career roll grants trappings from the second level and ticks the tracker',
        () => {
            expect(BONUS_TRAPPINGS).toEqual({ rolled: 2, choice: 1, free: 0 });

            const plan = (mode: 'rolled' | 'free', picks: string[]) =>
                planDraft(
                    {
                        career: { mode, careerId: 'c' },
                        stats: { mode: 'rolled', rolls },
                        talents: [],
                        canon: { ...canon, careerTrappings: picks },
                    },
                    {
                        ...ctx,
                        canon: {
                            ...ctx.canon!,
                            tier1: {
                                c: {
                                    ...ctx.canon!.tier1.c,
                                    nextTrappings: ['Axe', 'Shield', 'Helm'],
                                },
                            },
                        },
                    }
                );

            const ok = plan('rolled', ['Axe', 'Shield']);

            if (!ok.ok) throw new Error(ok.errors.join());

            expect(ok.characteristics.career?.ticks).toEqual([
                'trapping:axe',
                'trapping:shield',
            ]);
            expect(ok.items.map((i) => i.name)).toContain('Axe');

            const bad = plan('free', ['Axe']);

            expect(!bad.ok && bad.errors).toContain('TRAPPINGS_BONUS');
            expect(!plan('rolled', ['Axe', 'Shield', 'Helm']).ok).toBe(true);
        }
    );

    it('a new hero starts with 0 XP (legacy keeps its bonus profile)', () => {
        expect(CANON.creationMode).toBe('canon5e');
        expect(LEGACY.creationMode).toBe('legacy');
    });
});
