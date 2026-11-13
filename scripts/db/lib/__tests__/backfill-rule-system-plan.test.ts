import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import {
    type CampaignFacts,
    type FactCharacter,
    formatPlan,
    guessKey,
    planAll,
    planRow,
    type RowPlan,
    type RulesRow,
    summarizePlans,
} from '@/scripts/db/lib/backfill-rule-system-plan';
import { countLiterals, literalTokens } from '@/scripts/shared/system-ratchet';

beforeAll(async () => {
    await import('@/lib/utils/rules/systems/registry');
}, 30_000);

const NONE = new Set<string>();

const row = (rules: unknown, over: Partial<RulesRow> = {}): RulesRow => ({
    table: 'campaigns',
    id: 'c1',
    campaignId: 'c1',
    label: 'Camp',
    kind: 'campaign',
    text: JSON.stringify(rules),
    ...over,
});

const character = (over: Partial<FactCharacter> = {}): FactCharacter => ({
    id: 'ch1',
    campaignId: 'c1',
    name: 'Hero',
    level: 3,
    class: 'Fighter',
    classes: [],
    archetype: null,
    skillTreeProgress: {},
    personalSkillId: null,
    ...over,
});

const facts = (over: Partial<CampaignFacts> = {}): CampaignFacts => ({
    artifactSets: 0,
    skillTrees: 0,
    skills: 0,
    mainSkills: 0,
    characters: [],
    classIds: [],
    activeBattle: false,
    ...over,
});

const plan = (
    rules: unknown,
    f?: CampaignFacts,
    over: Partial<RulesRow> = {}
) => planRow(row(rules, over), f, { skipModules: NONE });

const noModules = {
    morale: { enabled: false },
    actions: { retaliation: false },
};

const d20Off = { classes: { enabled: true }, ...noModules };

describe('guessKey', () => {
    it('defaults to the key of the default ruleset', () => {
        expect(guessKey({})).toBe('homm');
    });

    it('guesses by enabled classes', () => {
        expect(guessKey({ classes: { enabled: true } })).toBe('dnd5e');
    });

    it('ignores a stored system', () => {
        expect(
            guessKey({ system: { key: 'wfrp' }, classes: { enabled: true } })
        ).toBe('dnd5e');
    });
});

describe('planRow keys', () => {
    it('writes only the guessed key into an empty object', () => {
        const p = plan({});

        expect(p.action).toBe('write');
        expect(p.after).toEqual({ key: 'homm' });
        expect(p.added).toEqual([]);
        expect(p.keyFrom).toBe('guess');
        expect(p.afterJson).toEqual({ system: { key: 'homm' } });
    });

    it('keeps the other sections untouched', () => {
        const attacks = { meleeName: 'A', rangedName: 'B', weaponName: 'C' };

        const p = plan({ defaultAttacks: attacks });

        expect(p.afterJson?.defaultAttacks).toEqual(attacks);
        expect(p.afterJson).toEqual({
            defaultAttacks: attacks,
            system: { key: 'homm' },
        });
    });

    it('classes enabled with module sections off: key only', () => {
        const p = plan(d20Off);

        expect(p.after).toEqual({ key: 'dnd5e' });
    });

    it('module defaults of a classes-enabled row become modules', () => {
        const p = plan({ classes: { enabled: true } });

        expect(p.after).toEqual({
            key: 'dnd5e',
            modules: ['morale', 'retaliation'],
        });
        expect(p.added).toEqual([
            { module: 'morale', why: 'morale.enabled', fromDefault: true },
            {
                module: 'retaliation',
                why: 'actions.retaliation',
                fromDefault: true,
            },
        ]);
    });

    it('stored key with explicit module sections', () => {
        const rules = {
            system: { key: 'dnd5e' },
            classes: { enabled: true },
            morale: { enabled: true },
            actions: { retaliation: false },
        };

        const p = plan(rules);

        expect(p.keyFrom).toBe('stored');
        expect(p.after).toEqual({ key: 'dnd5e', modules: ['morale'] });
        expect(p.added[0].fromDefault).toBeUndefined();
        expect(p.warnings).not.toContain('legacyUnsafe');
    });

    it('flags modules that the legacy guess would not reproduce', () => {
        const p = plan({
            system: { key: 'dnd5e' },
            morale: { enabled: true },
            actions: { retaliation: false },
        });

        expect(p.after?.modules).toEqual(['morale']);
        expect(p.warnings).toContain('legacyUnsafe');
    });

    it('a preset that already owns the module stays unchanged', () => {
        const p = plan({ system: { key: 'homm' }, morale: { enabled: true } });

        expect(p.action).toBe('unchanged');
        expect(p.afterJson?.system).toEqual({ key: 'homm' });
    });

    it('drops candidates the base cannot take', () => {
        const p = plan({ system: { key: 'wfrp' } });

        expect(p.action).toBe('unchanged');
        expect(p.dropped).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ module: 'retaliation' }),
            ])
        );
    });
});

describe('module criteria', () => {
    const base = { system: { key: 'dnd5e' }, ...noModules };

    const added = (rules: unknown, f?: CampaignFacts) =>
        plan(rules, f).added.map((r) => r.module);

    it('hero scaling dice tables', () => {
        const p = plan({
            ...base,
            heroScaling: { meleeDiceByLevel: { '1': '1d6' } },
        });

        expect(p.added).toEqual([
            { module: 'heroscaling', why: 'heroScaling.dice' },
        ]);
    });

    it('custom hero scaling values', () => {
        expect(added({ ...base, heroScaling: { hpBaseLevels: 5 } })).toEqual([
            'heroscaling',
        ]);
        expect(
            plan({ ...base, heroScaling: { hpBaseLevels: 5 } }).added[0].why
        ).toBe('heroScaling.custom');
    });

    it('artifact sets', () => {
        expect(added(base, facts({ artifactSets: 2 }))).toEqual([
            'artifactsets',
        ]);
    });

    it('skill trees', () => {
        expect(added(base, facts({ skillTrees: 1 }))).toEqual(['skilltrees']);
    });

    it('a personal skill needs skilltrees', () => {
        expect(
            added(
                base,
                facts({
                    characters: [character({ personalSkillId: 's1' })],
                })
            )
        ).toContain('skilltrees');
    });

    it('an archetype needs heroscaling', () => {
        const p = plan(
            base,
            facts({ characters: [character({ archetype: 'warrior' })] })
        );

        expect(p.added).toEqual([
            { module: 'heroscaling', why: 'archetype: 1' },
        ]);
    });

    it('classless characters of a class-owning system', () => {
        const p = plan(
            { ...d20Off, system: { key: 'dnd5e' } },
            facts({ characters: [character({ classes: [] })] })
        );

        expect(p.added).toEqual([
            { module: 'heroscaling', why: 'classless: 1' },
        ]);
    });

    it('a class resolved through the content layer is not classless', () => {
        const p = plan(
            { ...d20Off, system: { key: 'dnd5e' } },
            facts({
                characters: [
                    character({ classes: [{ classId: 'k1', level: 1 }] }),
                ],
                classIds: ['k1'],
            })
        );

        expect(p.added).toEqual([]);
        expect(p.action).toBe('unchanged');
    });
});

describe('skips', () => {
    it.each([
        { key: 'dnd5e', modules: [] },
        { key: 'dnd5e', modules: ['morale'] },
    ])('explicit modules %j', (system) => {
        const p = plan({ system });

        expect(p.action).toBe('skip');
        expect(p.skip).toBe('explicitModules');
    });

    it('invalid system', () => {
        const p = plan({ system: { key: 'nope' } });

        expect(p.skip).toBe('invalidSystem');
    });

    it('a snapshot of JSON null', () => {
        const p = planRow(
            {
                table: 'battle_scenes',
                id: 'b1',
                campaignId: 'c1',
                label: 'active',
                status: 'active',
                text: 'null',
            },
            undefined,
            { skipModules: NONE }
        );

        expect(p.skip).toBe('notObject');
    });

    it('skip-modules writes only the key', () => {
        const p = planRow(row({ classes: { enabled: true } }), undefined, {
            skipModules: new Set(['c1']),
        });

        expect(p.after).toEqual({ key: 'dnd5e' });
        expect(p.added).toEqual([]);
    });
});

describe('warnings', () => {
    it('active battle snapshot', () => {
        const p = planRow(
            {
                table: 'battle_scenes',
                id: 'b1',
                campaignId: 'c1',
                label: 'active',
                status: 'active',
                text: '{}',
            },
            undefined,
            { skipModules: NONE }
        );

        expect(p.action).toBe('write');
        expect(p.warnings).toContain('activeBattle');
    });

    it('campaign with an active battle', () => {
        expect(plan({}, facts({ activeBattle: true })).warnings).toContain(
            'activeBattle'
        );
    });

    it('a clone whose guess differs from the source', () => {
        const rows = [
            row(
                { system: { key: 'dnd5e' }, ...noModules },
                { id: 'src', campaignId: 'src' }
            ),
            row({}, { id: 'c1', campaignId: 'c1', createdFromId: 'src' }),
        ];

        const plans = planAll(rows, new Map(), NONE);

        expect(plans[1].warnings).toContain('guessDiffersFromSource');
        expect(plans[0].warnings).toEqual([]);
    });
});

describe('summary and idempotence', () => {
    const rows = [
        row({}, { id: 'a', campaignId: 'a' }),
        row({ classes: { enabled: true } }, { id: 'b', campaignId: 'b' }),
        row({ system: { key: 'homm' } }, { id: 'c', campaignId: 'c' }),
        row(
            { system: { key: 'dnd5e', modules: [] } },
            { id: 'd', campaignId: 'd' }
        ),
        row({ system: { key: 'x' } }, { id: 'e', campaignId: 'e' }),
        row(null, { id: 'f', campaignId: 'f' }),
    ];

    const plans = planAll(rows, new Map(), NONE);

    it('summarizes the plans', () => {
        expect(summarizePlans(plans)).toEqual({
            write: 2,
            keyOnly: 1,
            withModules: 1,
            unchanged: 1,
            skipped: { explicitModules: 1, invalidSystem: 1, notObject: 1 },
            warnings: {
                activeBattle: 0,
                legacyUnsafe: 0,
                guessDiffersFromSource: 0,
            },
            dropped: 0,
        });
    });

    it('a second run over the written JSON writes nothing', () => {
        const next = rows.map((r, i) => {
            const p: RowPlan = plans[i];

            return p.afterJson
                ? { ...r, text: JSON.stringify(p.afterJson) }
                : r;
        });

        const again = planAll(next, new Map(), NONE);

        expect(summarizePlans(again).write).toBe(0);
        expect(again.map((p) => p.action)).toEqual([
            'unchanged',
            'skip',
            'unchanged',
            'skip',
            'skip',
            'skip',
        ]);
    });

    it('formats one line per plan', () => {
        expect(formatPlan(plans[0])[0]).toContain('system: — →');
        expect(formatPlan(plans[2])[0]).toContain('без змін');
        expect(formatPlan(plans[3])[0]).toContain('пропущено');
    });
});

describe('no system literals in the CLI sources', () => {
    it.each([
        'scripts/db/lib/backfill-rule-system-plan.ts',
        'scripts/db/lib/backfill-rule-system-snapshot.ts',
        'scripts/db/lib/backfill-rule-system-db.ts',
        'scripts/db/backfill-rule-system.ts',
    ])('%s', (file) => {
        const text = readFileSync(join(process.cwd(), file), 'utf8');

        expect(countLiterals(text, literalTokens())).toBe(0);
    });
});
