import { describe, expect, it } from 'vitest';

import { validatePack } from '@/scripts/templates/lib/validate';
import { PACK_ADAPTERS } from '@/scripts/templates/systems';
import {
    fixturePack,
    FIXTURES_DIR,
} from '@/scripts/templates/systems/wfrp/__tests__/pack-helpers';
import {
    type WfrpData,
    wfrpDataOf,
} from '@/scripts/templates/systems/wfrp/common';
import { careerSkillIssue } from '@/scripts/templates/systems/wfrp/validate';

const base = fixturePack();

const load = (): WfrpData => structuredClone(wfrpDataOf(base));

const issuesOf = (data: WfrpData): string[] => {
    const { raceProfiles, rules, ...rows } = data;

    const pack = {
        ...base,
        rows: rows as typeof base.rows,
        extras: { 'race-profiles': raceProfiles },
        rules: rules as typeof base.rules,
    };

    return [
        ...validatePack(pack, { dir: FIXTURES_DIR }),
        ...(PACK_ADAPTERS['grim-d100'].validate?.(pack) ?? []),
    ]
        .filter((issue) => issue.level === 'error')
        .map((issue) => issue.message);
};

describe('readPack on the wfrp fixture', () => {
    it('reads the kind files, extras and rules', () => {
        const data = load();

        expect(data.races).toHaveLength(1);
        expect(data.careers).toHaveLength(2);
        expect(data.feats).toHaveLength(2);
        expect(data.units).toHaveLength(1);
        expect(data.spells).toHaveLength(1);
        expect(data.artifacts).toHaveLength(2);
        expect(data.raceProfiles).toHaveLength(1);
    });
});

describe('validatePack: wfrp', () => {
    it('accepts the good fixture', () => {
        expect(issuesOf(load())).toEqual([]);
    });

    it('rejects a duplicate career name', () => {
        const data = load();

        data.careers[1].name = 'vermin hunter';
        expect(
            issuesOf(data).some(
                (i) => i.includes('careers #2') && i.includes('duplicate name')
            )
        ).toBe(true);
    });

    it('rejects a tier talent that is not a feat', () => {
        const data = load();

        data.careers[0].tier2_talents = ['Missing Talent'];
        expect(issuesOf(data)).toContain(
            'careers #1 "Vermin Hunter": unknown tier2_talents "Missing Talent"'
        );
    });

    it('requires links to match the catalog name exactly', () => {
        const data = load();

        const talent = String(data.feats[0].name);

        data.careers[0].tier2_talents = [talent.toLowerCase()];
        data.raceProfiles[0].profile.talents = [talent.toUpperCase()];

        const issues = issuesOf(data);

        expect(issues).toContain(
            `careers #1 "Vermin Hunter": unknown tier2_talents "${talent.toLowerCase()}"`
        );
        expect(
            issues.some((i) =>
                i.includes(`unknown feat "${talent.toUpperCase()}"`)
            )
        ).toBe(true);
    });

    it('rejects a unit linking to a spell or race that is not in the data', () => {
        const data = load();

        data.units[0].knownSpells = ['Ghost Bolt'];
        data.units[0].raceId = 'Nobody';

        const issues = issuesOf(data);

        expect(issues).toContain(
            'units #1 "Giant Rat": unknown knownSpells "Ghost Bolt"'
        );
        expect(issues).toContain(
            'units #1 "Giant Rat": unknown raceId "Nobody"'
        );
    });

    it('rejects a nested spell link in a unit that is not in the data', () => {
        const data = load();

        data.units[0].abilities = [
            { name: 'Cast', description: 'x', spellId: 'Ghost Bolt' },
        ];
        expect(
            issuesOf(data).some(
                (i) => i.startsWith('units #1') && i.includes('"Ghost Bolt"')
            )
        ).toBe(true);
    });

    it('rejects a profile pointing at an unknown race, career or talent', () => {
        const data = load();

        data.raceProfiles[0] = {
            race: 'Nobody',
            profile: {
                ...data.raceProfiles[0].profile,
                talents: ['Nope'],
                careerTable: [{ max: 100, careerId: 'Ghost' }],
            },
        };

        const issues = issuesOf(data);

        expect(issues.some((i) => i.includes('unknown race'))).toBe(true);
        expect(issues.some((i) => i.includes('unknown feat "Nope"'))).toBe(
            true
        );
        expect(issues.some((i) => i.includes('unknown career "Ghost"'))).toBe(
            true
        );
    });

    it('rejects an invalid or duplicate row slug', () => {
        const data = load();

        data.careers[0].slug = 'Bad Slug';
        data.careers[1].slug = 'bad';

        expect(
            issuesOf(data).some(
                (i) => i.startsWith('careers #1') && i.includes('invalid slug')
            )
        ).toBe(true);

        data.careers[0].slug = 'bad';

        expect(
            issuesOf(data).some(
                (i) =>
                    i.startsWith('careers #2') &&
                    i.includes('duplicate slug "bad"')
            )
        ).toBe(true);
    });

    it('rejects a profile that breaks its own schema', () => {
        const data = load();

        data.raceProfiles[0].profile = {
            ...data.raceProfiles[0].profile,
            careerTable: [{ max: 50, careerId: 'Vermin Hunter' }],
        };
        expect(
            issuesOf(data).some(
                (i) =>
                    i.includes('race-profiles #1') &&
                    i.includes('creation.tableEnd')
            )
        ).toBe(true);
    });

    it('names the row that fails the resource schema or has an unknown column', () => {
        const data = load();

        data.units[0].maxHp = -5;
        data.feats[1].bogusColumn = 1;

        const issues = issuesOf(data);

        expect(issues.some((i) => i.startsWith('units #1 "Giant Rat"'))).toBe(
            true
        );
        expect(
            issues.some(
                (i) =>
                    i.startsWith('feats #2 "Sharp Eyed"') &&
                    i.includes('bogusColumn')
            )
        ).toBe(true);
    });

    it('rejects a row without a name', () => {
        const data = load();

        delete data.races[0].name;
        expect(
            issuesOf(data).some(
                (i) =>
                    i.startsWith('races #1') && i.includes('name is required')
            )
        ).toBe(true);
    });

    it('rejects invalid rules', () => {
        const data = load();

        data.rules = { ...data.rules, morale: { enabled: 'yes' } } as never;
        expect(issuesOf(data).some((i) => i.startsWith('rules:'))).toBe(true);
    });

    it.each([
        ['melee', 'needs a specialisation'],
        ['perception:x', 'takes no specialisation'],
        ['melee:spear', 'unknown specialisation'],
        ['sailing', 'unknown skill'],
    ])('rejects career skill %s', (skill, reason) => {
        const data = load();

        data.careers[0].tier1_skills = [skill];
        expect(issuesOf(data)).toContain(
            `careers #1 "Vermin Hunter": tier1_skills "${skill}" ${reason}`
        );
    });

    it('accepts open and fixed specialisations', () => {
        expect(careerSkillIssue('lore:herbs')).toBeNull();
        expect(careerSkillIssue('ranged:bow')).toBeNull();
        expect(careerSkillIssue('perception')).toBeNull();
    });

    it('rejects a malformed tier status', () => {
        const data = load();

        data.careers[0].tier1_status = 'Copper 2';
        expect(issuesOf(data).some((i) => i.includes('tier1_status'))).toBe(
            true
        );
    });

    it.each(['talents', 'careerTable'] as const)(
        'rejects a profile without %s',
        (key) => {
            const data = load();

            delete (
                data.raceProfiles[0].profile as Partial<
                    (typeof data.raceProfiles)[0]['profile']
                >
            )[key];
            expect(
                issuesOf(data).some((i) =>
                    i.includes(`profile missing "${key}"`)
                )
            ).toBe(true);
        }
    );

    it('rejects a non-ascending careerTable', () => {
        const data = load();

        data.raceProfiles[0].profile.careerTable = [
            { max: 60, careerId: 'Vermin Hunter' },
            { max: 40, careerId: 'Watchman' },
            { max: 100, careerId: 'Watchman' },
        ];
        expect(
            issuesOf(data).some((i) => i.includes('creation.tableAscending'))
        ).toBe(true);
    });

    it('rejects forbidden terms in deep strings, by word boundary', () => {
        const data = load();

        data.feats[0].description = 'Blessed by SIGMAR.';
        data.races[0].passiveAbility = {
            name: 'Stubborn',
            description: 'From the old world',
        };
        data.careers[0].tier3_trappings = ['Warpstone shard'];

        const issues = issuesOf(data);

        expect(issues).toContain('feats #1 "Hardy": forbidden term "Sigmar"');
        expect(issues).toContain(
            'races #1 "Hollander": forbidden term "Old World"'
        );
        expect(issues).toContain(
            'careers #1 "Vermin Hunter": forbidden term "Warpstone"'
        );
    });

    it('does not flag substrings of forbidden terms', () => {
        const data = load();

        data.feats[0].description = 'Tomorrow, chaotic';
        expect(issuesOf(data)).toEqual([]);
    });

    it('rejects a mechanical talent with broken abilities', () => {
        const data = load();

        data.feats[0].abilities = [
            { name: 'x', trigger: { event: 'passive' }, effects: [] },
        ];
        expect(
            issuesOf(data).some((i) =>
                i.startsWith('feats #1 "Hardy": abilities')
            )
        ).toBe(true);
    });

    it('scans multi-word, plural, derived and hyphenated forms', () => {
        const data = load();

        data.feats[0].description =
            "Daemons of the north, two Empires, Witch-Hunter's warrant, Imperials, Reiklander, Middenheimer, Bögenhafen, Snotlings";
        data.careers[0].tier1_skills = ['lore:old-world'];

        const issues = issuesOf(data).join('\n');

        for (const term of [
            'Daemon',
            'Empire',
            'Witch Hunter',
            'Imperial',
            'Reikland',
            'Middenheim',
            'Bögenhafen',
            'Snotling',
            'Old World',
        ])
            expect(issues).toContain(`forbidden term "${term}"`);
    });

    it('does not flag words that merely contain a term', () => {
        const data = load();

        data.feats[0].description =
            'Sgorfel and Chaoses of Moo, Imperially, a Mooted plan';
        expect(issuesOf(data).filter((i) => i.includes('forbidden'))).toEqual(
            []
        );
    });

    it('rejects a feat ability that is not a passive modifyStat on an allowed stat', () => {
        const data = load();

        data.feats[0].abilities = [
            {
                id: 'a1',
                name: 'x',
                trigger: { event: 'onHit' },
                effects: [{ kind: 'modifyStat', stat: 'strength', flat: 1 }],
            },
        ];

        const issues = issuesOf(data);

        expect(issues.some((i) => i.includes('only a passive trigger'))).toBe(
            true
        );
        expect(
            issues.some((i) =>
                i.includes('only modifyStat on attackBonus/maxHp/initiative')
            )
        ).toBe(true);
    });

    it('reports null profile and null profile lists instead of throwing', () => {
        const data = load();

        (data.raceProfiles[0] as { profile: unknown }).profile = null;
        expect(
            issuesOf(data).some((i) => i.includes('profile must be an object'))
        ).toBe(true);

        const other = load();

        (
            other.raceProfiles[0].profile as unknown as Record<string, unknown>
        ).talents = null;
        expect(
            issuesOf(other).some((i) =>
                i.includes('profile "talents" must be an array')
            )
        ).toBe(true);
    });
});

describe('validatePack: wfrp units', () => {
    const where = 'units #1 "Giant Rat": ';

    const ab = (
        id: string,
        name: string,
        effect: object,
        event = 'passive'
    ) => ({ id, name, trigger: { event }, effects: [effect] });

    const regenerate = (event: string) =>
        ab(
            'regenerate',
            'Regenerate',
            { kind: 'heal', amount: '1d10', target: 'self' },
            event
        );

    type Mutate = (rat: Record<string, any>) => void; // eslint-disable-line @typescript-eslint/no-explicit-any

    const cases: Array<[string, Mutate, string[]]> = [
        [
            'a missing characteristic',
            (r) => delete r.characteristics.base.fel,
            [
                'characteristics.base must list all 10 characteristics (missing fel)',
            ],
        ],
        [
            'extra characteristics keys',
            (r) => (r.characteristics.skillAdvances = {}),
            ['characteristics may hold only base and move (got skillAdvances)'],
        ],
        [
            'an unknown theme',
            (r) => (r.statblock.creatureType = 'Dragons'),
            [
                'statblock must be { creatureType } with one of: Beasts, Raiders, Restless Dead, Cultists, Constructs, Horrors',
            ],
        ],
        [
            'an unknown level',
            (r) => (r.level = 5),
            ['level must be one of 1, 2, 3, 4'],
        ],
        [
            'a 5e column',
            (r) => (r.strength = 10),
            ['column "strength" is not used by Grim units'],
        ],
        [
            'the attacks column',
            (r) =>
                (r.attacks = [
                    {
                        name: 'Bite',
                        attackBonus: 2,
                        damageType: 'piercing',
                        damageDice: '1d4',
                    },
                ]),
            ['column "attacks" is not used by Grim units'],
        ],
        [
            'armour with uneven locations',
            (r) =>
                r.abilities.push(
                    ab('armour', 'Armour 1', {
                        kind: 'wfrpArmour',
                        head: 1,
                        body: 0,
                        arm: 0,
                        leg: 0,
                    })
                ),
            [
                'abilities[2] "Armour 1": is not the output of the "armour" trait recipe',
            ],
        ],
        [
            'the terror id',
            (r) =>
                r.abilities.push(
                    ab('terror', 'Terror 1', {
                        kind: 'wfrpPsychology',
                        psychology: 'terror',
                        value: 1,
                    })
                ),
            ['abilities[2] "Terror 1": unknown trait id "terror"'],
        ],
        [
            'a passive regenerate',
            (r) => r.abilities.push(regenerate('passive')),
            [
                'abilities[2] "Regenerate": is not the output of the "regenerate" trait recipe',
            ],
        ],
        [
            'breath without range',
            (r) =>
                r.abilities.push(
                    ab('breath', 'Breath +3', {
                        kind: 'wfrpAttack',
                        attack: 'breath',
                        damage: 3,
                    })
                ),
            [
                'abilities[2] "Breath +3": is not the output of the "breath" trait recipe',
            ],
        ],
        [
            'a ranged attack above the band',
            (r) =>
                r.abilities.push(
                    ab('ranged', 'Sling +5', {
                        kind: 'wfrpAttack',
                        attack: 'ranged',
                        damage: 5,
                        rangeFt: 60,
                    })
                ),
            ['attack "Sling +5" damage 5 is outside 1–4 for level 1'],
        ],
        [
            'a ranged attack out of range',
            (r) =>
                r.abilities.push(
                    ab('ranged', 'Sling +2', {
                        kind: 'wfrpAttack',
                        attack: 'ranged',
                        damage: 2,
                        rangeFt: 400,
                    })
                ),
            ['attack "Sling +2" range 400 ft is outside 24–300'],
        ],
        [
            'a duplicate trait id',
            (r) =>
                r.abilities.push(
                    ab('bite', 'Bite +3', {
                        kind: 'wfrpAttack',
                        attack: 'bite',
                        damage: 3,
                    })
                ),
            ['abilities[2] "Bite +3": duplicate trait id "bite"'],
        ],
        [
            'a wrong speed',
            (r) => (r.speed = 30),
            ['speed 30 must equal move × 6 = 24'],
        ],
        [
            'a wrong initiative',
            (r) => (r.initiative = 10),
            ['initiative 10 must equal I 30'],
        ],
        [
            'a wrong gridSize',
            (r) => (r.gridSize = 2),
            ['gridSize 2 must be 1 for size small'],
        ],
        [
            'a wrong maxHp',
            (r) => (r.maxHp = 6),
            ['maxHp 6 must equal Wounds 5'],
        ],
        [
            'a characteristic out of band',
            (r) => (r.characteristics.base.ws = 60),
            [
                'characteristic "ws" 60 is outside 5–45 for level 1',
                'max(ws, bs) 60 is outside 20–45 for level 1',
            ],
        ],
        [
            'Ward on level 1',
            (r) =>
                r.abilities.push(
                    ab('ward', 'Ward 9+', { kind: 'wfrpWard', value: 9 })
                ),
            ['Ward is not allowed for level 1'],
        ],
        [
            'Magical on level 1',
            (r) => (r.abilities[1].effects[0].magical = true),
            ['Magical is not allowed for level 1'],
        ],
        [
            'Regenerate on level 1',
            (r) => r.abilities.push(regenerate('turnStart')),
            ['Regenerate is not allowed for level 1'],
        ],
        [
            'Fear above the level cap',
            (r) =>
                r.abilities.push(
                    ab('fear', 'Fear 2', {
                        kind: 'wfrpPsychology',
                        psychology: 'fear',
                        value: 2,
                    })
                ),
            ['Fear 2 is above 1 for level 1'],
        ],
    ];

    it.each(cases)('rejects %s', (_name, mutate, expected) => {
        const data = load();

        mutate(data.units[0] as Record<string, any>); // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(issuesOf(data)).toEqual(
            expect.arrayContaining(expected.map((e) => where + e))
        );
    });
});

describe('validatePack: wfrp spells', () => {
    const where = 'spells #1 "Rot Touch": ';

    type Mutate = (data: Record<string, any>) => void; // eslint-disable-line @typescript-eslint/no-explicit-any

    const arcane: Mutate = (d) => {
        d.spells[0].casting.magic.kind = 'arcane';
        d.spells[0].casting.magic.cn = 4;
        d.spells[0].lists = ['School of Embers'];
    };

    const ingredient =
        (minGp: number): Mutate =>
        (d) => {
            arcane(d);
            Object.assign(d.spells[0].casting.magic, { overcast: 'dice' });
            Object.assign(d.spells[0], {
                upcastDice: 1,
                ingredients: [
                    {
                        name: 'Bone',
                        qty: 1,
                        minGp,
                        consumed: true,
                        focus: false,
                    },
                ],
                componentFlags: { v: true, s: true, m: true },
            });
        };

    const cases: Array<[string, Mutate, string]> = [
        [
            'no casting',
            (d) => (d.spells[0].casting = undefined),
            'casting.magic is required',
        ],
        [
            'a chaos kind',
            (d) => (d.spells[0].casting.magic.kind = 'chaos'),
            'kind "chaos" is not used by Grim spells',
        ],
        [
            'a CN above the band',
            (d) => (d.spells[0].casting.magic.cn = 3),
            'CN 3 is outside 0–2 for petty',
        ],
        [
            'petty dice overcast',
            (d) => (d.spells[0].casting.magic.overcast = 'dice'),
            'overcast "dice" is not allowed for petty',
        ],
        [
            'targets overcast',
            (d) => {
                arcane(d);
                d.spells[0].casting.magic.overcast = 'targets';
            },
            'overcast "targets" is not supported by the engine',
        ],
        [
            'a long cost',
            (d) => (d.spells[0].cost = 'long'),
            'cost must be "action"',
        ],
        ['a level 2 spell', (d) => (d.spells[0].level = 2), 'level must be 1'],
        [
            'a foreign list',
            (d) => (d.spells[0].lists = ['Fenlore']),
            'lists must be one of: Cantrips',
        ],
        [
            'no list',
            (d) => (d.spells[0].lists = []),
            'lists must be one of: Cantrips',
        ],
        [
            'a resolution column',
            (d) => (d.spells[0].resolution = { kind: 'auto' }),
            'column "resolution" is not used by Grim spells',
        ],
        [
            'a 5e condition effect',
            (d) =>
                (d.spells[0].spellEffects = [
                    {
                        kind: 'applyCondition',
                        condition: 'prone',
                        duration: { rounds: 1 },
                    },
                ]),
            'effect "applyCondition" is not allowed (dealDamage or heal only)',
        ],
        [
            'zero dice with an effect',
            (d) => (d.spells[0].dice = 0),
            'dice must be ≥ 1 exactly when the spell has an effect',
        ],
        [
            'neither effect nor attribute',
            (d) => {
                d.spells[0].spellEffects = [];
                d.spells[0].dice = 0;
            },
            'spell has neither an effect nor an attribute',
        ],
        [
            'a non-wfrp condition',
            (d) =>
                (d.spells[0].casting.magic.attribute = {
                    condition: 'frightened',
                    levels: 1,
                }),
            'attribute condition "frightened" is not a wfrp condition',
        ],
        [
            'an ally target on damage',
            (d) => (d.spells[0].targeting = { kind: 'ally', range: 5 }),
            'targeting "ally" does not fit a harmful spell',
        ],
        [
            'petty ingredients',
            (d) => {
                d.spells[0].ingredients = [
                    {
                        name: 'Bone',
                        qty: 1,
                        minGp: 0.05,
                        consumed: true,
                        focus: false,
                    },
                ];
                d.spells[0].componentFlags = { v: true, s: true, m: true };
            },
            'ingredients are not allowed for petty',
        ],
        [
            'a sub-pence ingredient price',
            ingredient(0.01),
            'ingredient price 2.4 p is outside 6–240 p (whole pence)',
        ],
    ];

    it.each(cases)('rejects %s', (_name, mutate, expected) => {
        const data = load();

        mutate(data as never);
        expect(issuesOf(data)).toContain(where + expected);
    });

    it('rejects a unit that cannot reach the CN of a known spell', () => {
        const data = load();

        data.units[0].knownSpells = ['Rot Touch'];
        (data.spells[0].casting as { magic: { cn: number } }).magic.cn = 2;
        expect(issuesOf(data)).toContain(
            'units #1 "Giant Rat": knownSpells "Rot Touch" CN 2 is above the best SL 1 this unit can reach'
        );
    });
});

describe('validatePack: wfrp artifacts', () => {
    const w = 'artifacts #1 "Arming Sword": ';

    const a = 'artifacts #2 "Padded Jack": ';

    type Mutate = (
        sword: Record<string, any>,
        jack: Record<string, any>
    ) => void;  

    const cases: Array<[string, Mutate, string]> = [
        [
            'missing systemStats',
            (s) => delete s.systemStats,
            w + 'systemStats is required',
        ],
        [
            'a range weapon in the melee slot name',
            (s) => (s.slot = 'range_weapon'),
            w + 'slot "range_weapon" needs a weapon with range',
        ],
        [
            'an unused slot',
            (s) => (s.slot = 'ring'),
            w + 'slot "ring" is not used by Grim items',
        ],
        [
            'an unused group',
            (s) => (s.systemStats.group = 'explosives'),
            w + 'group "explosives" is not used by Grim items',
        ],
        [
            'an unimplemented quality',
            (s) => (s.systemStats.qualities = [{ key: 'defensive' }]),
            w + 'quality "defensive" is not implemented',
        ],
        [
            'a flaw as a quality',
            (s) => (s.systemStats.qualities = [{ key: 'slow' }]),
            w + '"slow" is a flaw, not a quality',
        ],
        [
            'damage above the band',
            (s) => (s.systemStats.damage.flat = 9),
            w + 'damage +9 is outside 1–5 for basic',
        ],
        [
            'a price above the band',
            (s) => (s.systemStats.price = 5000),
            w + 'price 5000 p is outside 6–480 p for basic',
        ],
        [
            'a fractional price',
            (s) => (s.systemStats.price = 10.5),
            w + 'price 10.5 p is outside 6–480 p for basic',
        ],
        [
            'reload without ammoCapacity',
            (s) => (s.systemStats.flaws = [{ key: 'reload', value: 1 }]),
            w + 'reload needs ammoCapacity and ammoCapacity needs reload',
        ],
        [
            'head AP in the armor slot',
            (_s, j) => (j.systemStats.locations.head = 1),
            a + 'slot "armor" must leave head at 0',
        ],
        [
            'body armour in the helmet slot',
            (_s, j) => (j.slot = 'helmet'),
            a + 'slot "helmet" may cover only head',
        ],
        [
            'AP above the kind band',
            (_s, j) => (j.systemStats.locations.body = 2),
            a + 'AP 2 is outside 0–1 for soft',
        ],
        [
            'armour in the shield slot',
            (_s, j) => (j.slot = 'shield'),
            a + 'slot "shield" needs gear with one "shield X" quality',
        ],
        [
            'a rare item',
            (_s, j) => (j.rarity = 'rare'),
            a + 'rarity must be common or uncommon',
        ],
        [
            'an icon column',
            (s) => (s.icon = 'x'),
            w + 'column "icon" is not used by Grim items',
        ],
    ];

    it.each(cases)('rejects %s', (_name, mutate, expected) => {
        const data = load();

        mutate(data.artifacts[0] as never, data.artifacts[1] as never);
        expect(issuesOf(data)).toContain(expected);
    });

    it('reports a zod error with the systemStats path', () => {
        const data = load();

        (
            data.artifacts[0].systemStats as { damage: { flat: unknown } }
        ).damage.flat = 'x';
        expect(
            issuesOf(data).some((i) => i.startsWith(w + 'systemStats '))
        ).toBe(true);
    });

    it('checks rules tables order and scans rules for forbidden terms', () => {
        const data = load();

        data.rules = {
            ...data.rules,
            tables: {
                miscastMinor: [
                    { max: 50, effects: [] },
                    { max: 40, effects: [] },
                ],
            },
        } as WfrpData['rules'];
        expect(
            issuesOf(data).some((i) =>
                i.startsWith('rules: tables.miscastMinor')
            )
        ).toBe(true);

        const rows = Array.from({ length: 7 }, (_, n) => ({
            max: (n + 1) * 10,
            text: 't',
            effects: [],
        }));

        data.rules = {
            ...data.rules,
            tables: {
                wrath: [
                    ...rows,
                    { max: 100, text: 'The Empire falls', effects: [] },
                ],
            },
        } as WfrpData['rules'];
        expect(issuesOf(data)).toContain('rules: forbidden term "Empire"');
    });
});
