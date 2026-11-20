import { readFileSync } from 'node:fs';
import { describe, expect } from 'vitest';

import { bookExample, CANON } from './book-example';

import { equipmentIssues } from '@/scripts/templates/systems/wfrp/equipment';
import { DEFAULT_ADVANCEMENT_RULES } from '@/systems/wfrp/rules/advancement/rules';
import { extractWfrpAttacks } from '@/systems/wfrp/rules/combat/extract-attacks';
import { type CreationCtx, planDraft } from '@/systems/wfrp/rules/creation';
import { parseProfile } from '@/systems/wfrp/rules/creation/schema';
import { armourTestPenalties } from '@/systems/wfrp/rules/equipment/armour';
import { TALENT_KINDS } from '@/systems/wfrp/rules/trait-kinds';

const grim = (file: string) =>
    JSON.parse(
        readFileSync(`data/templates/grim-d100/${file}.json`, 'utf8')
    ) as Array<Record<string, unknown>>;

const artifact = (slug: string) => {
    const row = grim('artifacts').find((a) => a.slug === slug);

    if (!row) throw new Error(slug);

    return row;
};

const profile = parseProfile({
    move: 3,
    fate: 2,
    fortune: 2,
    talents: ['sturdy'],
    talentChoices: [
        ['lettered', 'relentless'],
        ['resolute', 'strongMinded'],
    ],
    careerTable: [{ max: 100, careerId: 'c' }],
});

const ctx: CreationCtx = {
    profile,
    rules: DEFAULT_ADVANCEMENT_RULES,
    careerIds: new Set(['c']),
    featIds: new Set([
        'sturdy',
        'lettered',
        'relentless',
        'resolute',
        'strongMinded',
    ]),
    canon: {
        step: CANON.advanceStep,
        tier1: {
            c: {
                characteristics: ['int'],
                skills: ['x'],
                talents: [],
                trappings: [],
            },
        },
    },
};

const draft = (speciesTalents?: string[]) =>
    planDraft(
        {
            career: { mode: 'choice', careerId: 'c' },
            stats: { mode: 'rolled', rolls: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5] },
            talents: [],
            canon: { careerSkills: { x: 3 }, speciesTalents },
        },
        ctx
    );

const errorsOf = (r: ReturnType<typeof draft>) => (r.ok ? [] : r.errors);

describe('canon p29-34: species talent pairs', () => {
    bookExample(29, 'one talent from each "X or Y" pair is taken', () => {
        const r = draft(['relentless', 'resolute']);

        expect(errorsOf(r)).not.toContain('SPECIES_TALENTS');

        const talents = Object.keys(
            r.ok ? r.characteristics.talents : {}
        ).sort();

        expect(talents).toEqual(['relentless', 'resolute', 'sturdy']);
    });

    bookExample(29, 'a missing or foreign pick is rejected', () => {
        expect(errorsOf(draft())).toContain('SPECIES_TALENTS');
        expect(errorsOf(draft(['relentless']))).toContain('SPECIES_TALENTS');
        expect(errorsOf(draft(['resolute', 'lettered']))).toContain(
            'SPECIES_TALENTS'
        );
    });

    bookExample(29, 'a profile without pairs takes none', () => {
        const plain = { ...ctx, profile: { ...profile, talentChoices: [] } };

        const r = planDraft(
            {
                career: { mode: 'choice', careerId: 'c' },
                stats: {
                    mode: 'rolled',
                    rolls: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
                },
                talents: [],
                canon: { careerSkills: { x: 3 } },
            },
            plain
        );

        expect(errorsOf(r)).not.toContain('SPECIES_TALENTS');
    });
});

describe('canon p29-34: grim species pairs name existing talents', () => {
    const feats = new Set(grim('feats').map((f) => f.name));

    bookExample(29, 'every option of every pair is a talent', () => {
        const profiles = grim('race-profiles') as unknown as Array<{
            race: string;
            profile: { talentChoices?: string[][] };
        }>;

        const withPairs = profiles.filter((p) => p.profile.talentChoices);

        expect(withPairs.map((p) => p.race).sort()).toEqual([
            'delver',
            'thornkin',
            'veyl',
        ]);

        for (const { profile: p } of withPairs)
            for (const option of (p.talentChoices ?? []).flat())
                expect(feats.has(option)).toBe(true);
    });

    bookExample(168, 'Trick Rider is carried by Saddle Acrobat', () => {
        const feat = grim('feats').find((f) => f.name === 'Saddle Acrobat');

        const effect = JSON.stringify(feat?.abilities);

        expect(effect).toContain('"talent":"trickRider"');
        expect(TALENT_KINDS).toContain('trickRider');
    });

    bookExample(
        124,
        'no career names a generic Deep Scholar or Terrain Strider',
        () => {
            const names = JSON.stringify(grim('careers'));

            expect(names).not.toContain('Deep Scholar (Lore)');
            expect(names).not.toContain('Terrain Strider (Terrain)');
            expect(feats.has('Terrain Strider (Woodland)')).toBe(true);
            expect(feats.has('Deep Scholar (History)')).toBe(true);
        }
    );
});

describe('canon p303-307: content rows', () => {
    bookExample(
        307,
        'quick armour covers every location with its AP and penalties',
        () => {
            for (const [slug, ap] of [
                ['light-field-harness', 1],
                ['medium-field-harness', 3],
                ['heavy-field-harness', 5],
            ] as const) {
                const row = artifact(slug);

                const stats = row.systemStats as {
                    locations: Record<string, number>;
                };

                expect(Object.values(stats.locations)).toEqual([
                    ap,
                    ap,
                    ap,
                    ap,
                ]);
                expect(equipmentIssues(row as never)).toEqual([]);
            }

            const worn = (slug: string) => [
                {
                    slot: 'armor',
                    systemStats: artifact(slug).systemStats,
                },
            ];

            expect(
                armourTestPenalties(worn('light-field-harness') as never)
            ).toEqual({});
            expect(
                armourTestPenalties(worn('medium-field-harness') as never)
            ).toEqual({
                stealth: -1,
            });
            expect(
                armourTestPenalties(worn('heavy-field-harness') as never)
            ).toEqual({
                perception: -2,
                stealth: -2,
            });
        }
    );

    bookExample(
        303,
        'the entangling group carries Bolas, Lasso and Net',
        () => {
            for (const slug of [
                'snare-bolas',
                'herder-s-lasso',
                'tangle-net',
            ]) {
                const row = artifact(slug);

                expect((row.systemStats as { group: string }).group).toBe(
                    'entangling'
                );
                expect(equipmentIssues(row as never)).toEqual([]);
            }

            const bolas = artifact('snare-bolas').systemStats as {
                qualities: Array<{ condition?: string; location?: string }>;
            };

            expect(
                bolas.qualities.map((q) => [q.condition, q.location])
            ).toEqual([
                ['entangled', 'leg'],
                ['prone', 'leg'],
            ]);
        }
    );

    bookExample(
        301,
        'Unarmed, Improvised Weapon and Thrown Rock are valid rows',
        () => {
            for (const slug of [
                'unarmed-strike',
                'improvised-weapon',
                'thrown-rock',
            ])
                expect(equipmentIssues(artifact(slug) as never)).toEqual([]);
        }
    );
});

describe('canon p301: unarmed fallback', () => {
    bookExample(
        301,
        'a canon fighter without a melee weapon strikes Unarmed',
        () => {
            const attacks = extractWfrpAttacks({
                rows: [],
                rules: { edition: { preset: 'canon5e' } } as never,
            });

            expect(attacks.map((a) => a.id)).toEqual(['unarmed']);
        }
    );

    bookExample(301, 'legacy adds nothing', () => {
        expect(extractWfrpAttacks({ rows: [] })).toEqual([]);
    });
});
