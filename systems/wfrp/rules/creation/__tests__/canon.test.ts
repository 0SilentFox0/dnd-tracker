import { describe, expect, it } from 'vitest';

import type { CanonPicks } from '../canon';
import { type CreationCtx, type CreationPicks, planDraft } from '../plan';
import { parseProfile } from '../schema';

import { DEFAULT_ADVANCEMENT_RULES } from '@/systems/wfrp/rules/advancement/rules';

const profile = parseProfile({
    mods: { ws: 10 },
    move: 4,
    fate: 4,
    fortune: 3,
    talents: ['fixed'],
    careerTable: [{ max: 100, careerId: 'c1' }],
    skillPicks: { count: 5, options: ['a', 'b', 'c', 'd', 'e', 'f'] },
    languages: ['language:trade-cant'],
});

const ctx: CreationCtx = {
    profile,
    rules: DEFAULT_ADVANCEMENT_RULES,
    careerIds: new Set(['c1']),
    featIds: new Set(['fixed', 't1', 't2']),
    canon: {
        step: 5,
        tier1: {
            c1: {
                characteristics: ['ws', 'int', 'wp'],
                skills: ['x', 'y', 'z'],
                talents: ['t1', 't2'],
                trappings: ['Rope', 'Lantern'],
            },
        },
    },
};

const rolls = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const goodCanon: CanonPicks = {
    speciesSkills: ['a', 'b', 'c', 'd', 'e'],
    careerSkills: { x: 3, y: 3, z: 2 },
    careerTalent: 't1',
};

const picks = (
    over: Partial<CreationPicks> = {},
    canon: CanonPicks = goodCanon
): CreationPicks => ({
    career: { mode: 'rolled', careerId: 'c1' },
    stats: { mode: 'rolled', rolls },
    talents: [],
    canon,
    ...over,
});

const run = (p: CreationPicks, c: CreationCtx = ctx) => planDraft(p, c);

const errorsOf = (p: CreationPicks, c: CreationCtx = ctx) => {
    const r = run(p, c);

    return r.ok ? [] : r.errors;
};

describe('planDraft canon5e', () => {
    it('gives no starting experience and returns the career trappings', () => {
        const r = run(picks());

        if (!r.ok) throw new Error(r.errors.join());

        expect(r.experience).toBe(0);
        expect(r.trappings).toEqual([
            'Clothing',
            'Dagger',
            'Pouch',
            'Rope',
            'Lantern',
        ]);
    });

    it('stores purchases as points (step 5), species and career together', () => {
        const r = run(picks());

        if (!r.ok) throw new Error(r.errors.join());

        expect(r.characteristics.skillAdvances).toEqual({
            'language:trade-cant': 30,
            a: 5,
            b: 5,
            c: 5,
            d: 5,
            e: 5,
            x: 15,
            y: 15,
            z: 10,
        });
        expect(r.characteristics.talents).toEqual({ fixed: 1, t1: 1 });
    });

    it('rolled: +6 spread over career characteristics goes into the base', () => {
        const r = run(
            picks({}, { ...goodCanon, distribution: { ws: 2, int: 4 } })
        );

        if (!r.ok) throw new Error(r.errors.join());

        expect(r.characteristics.base.ws).toBe(20 + 10 + 2 + 2);
        expect(r.characteristics.base.int).toBe(20 + 9 + 4);
        expect(r.characteristics.advances.int).toBe(0);
    });

    it.each([
        ['rolled over 6', { mode: 'rolled' as const, rolls }, { ws: 7 }],
        [
            'rearranged over 3',
            { mode: 'rearranged' as const, rolls, arranged: rolls },
            { ws: 4 },
        ],
        [
            'free gets none',
            { mode: 'free' as const, points: Array(10).fill(10) },
            { ws: 1 },
        ],
        ['non-career key', { mode: 'rolled' as const, rolls }, { s: 1 }],
    ])('rejects a distribution: %s', (_n, stats, distribution) => {
        expect(
            errorsOf(picks({ stats }, { ...goodCanon, distribution }))
        ).toContain('STATS_DISTRIBUTION');
    });

    it('free points are capped at 16 under canon', () => {
        const points = [17, 3, 10, 10, 10, 10, 10, 10, 10, 10];

        expect(errorsOf(picks({ stats: { mode: 'free', points } }))).toContain(
            'POINTS_RANGE'
        );
    });

    it('Fate +1 only when species, career and characteristics keep the first roll', () => {
        const fateOf = (over: Partial<CreationPicks>, rolled: boolean) => {
            const r = run(picks(over, { ...goodCanon, speciesRolled: rolled }));

            if (!r.ok) throw new Error(r.errors.join());

            return r.characteristics;
        };

        expect(fateOf({}, true).fate).toBe(5);
        expect(fateOf({}, false).fate).toBe(4);
        expect(
            fateOf(
                { stats: { mode: 'rearranged', rolls, arranged: rolls } },
                true
            ).fate
        ).toBe(4);
        expect(
            fateOf({ career: { mode: 'choice', careerId: 'c1' } }, true).fate
        ).toBe(4);
    });

    it('Fortune +1 for a kept species roll', () => {
        const r = run(picks({}, { ...goodCanon, speciesRolled: true }));

        if (!r.ok) throw new Error(r.errors.join());

        expect(r.characteristics.fortune).toBe(4);
    });

    it('requires five species picks from the options', () => {
        expect(
            errorsOf(picks({}, { ...goodCanon, speciesSkills: ['a'] }))
        ).toContain('SPECIES_SKILLS');
        expect(
            errorsOf(
                picks(
                    {},
                    { ...goodCanon, speciesSkills: ['a', 'b', 'c', 'd', 'q'] }
                )
            )
        ).toContain('SPECIES_SKILLS');
    });

    it('requires exactly 8 career purchases from tier 1 skills', () => {
        expect(
            errorsOf(picks({}, { ...goodCanon, careerSkills: { x: 3, y: 4 } }))
        ).toContain('CAREER_SKILLS');
        expect(
            errorsOf(picks({}, { ...goodCanon, careerSkills: { x: 3, y: 3 } }))
        ).toContain('CAREER_SKILLS');
        expect(
            errorsOf(
                picks({}, { ...goodCanon, careerSkills: { x: 3, y: 3, q: 2 } })
            )
        ).toContain('CAREER_SKILLS');
    });

    it('no skill exceeds 3 purchases across species and career', () => {
        expect(
            errorsOf(
                picks(
                    {},
                    {
                        ...goodCanon,
                        speciesSkills: ['x', 'b', 'c', 'd', 'e'],
                        careerSkills: { x: 3, y: 3, z: 2 },
                    }
                )
            )
        ).toContain('SKILL_CAP');
    });

    it('requires one career talent from tier 1', () => {
        expect(
            errorsOf(picks({}, { ...goodCanon, careerTalent: undefined }))
        ).toContain('TALENT_CAREER');
        expect(
            errorsOf(picks({}, { ...goodCanon, careerTalent: 'fixed' }))
        ).toContain('TALENT_CAREER');
    });

    it('legacy ctx ignores canon picks and keeps starting experience', () => {
        const r = run(picks(), { ...ctx, canon: undefined });

        if (!r.ok) throw new Error(r.errors.join());

        expect(r.experience).toBe(100);
        expect(r.trappings).toEqual([]);
        expect(r.characteristics.skillAdvances).toEqual({});
    });

    it('duplicate species skill picks are rejected', () => {
        expect(
            errorsOf(
                picks(
                    {},
                    { ...goodCanon, speciesSkills: ['a', 'a', 'b', 'c', 'd'] }
                )
            )
        ).toContain('SPECIES_SKILLS');
    });

    it('a career skill group matches its specialisations', () => {
        const grouped: CreationCtx = {
            ...ctx,
            canon: {
                step: 5,
                tier1: {
                    c1: { ...ctx.canon!.tier1.c1, skills: ['x', 'y', 'lore'] },
                },
            },
        };

        const r = run(
            picks(
                {},
                { ...goodCanon, careerSkills: { x: 3, y: 3, 'lore:magic': 2 } }
            ),
            grouped
        );

        expect(r.ok).toBe(true);
    });

    it('species languages sit outside the per-skill cap', () => {
        const r = run(
            picks(
                {},
                {
                    ...goodCanon,
                    careerSkills: { x: 3, y: 3, z: 2 },
                }
            )
        );

        if (!r.ok) throw new Error(r.errors.join());

        expect(r.characteristics.skillAdvances['language:trade-cant']).toBe(30);
    });
});
