import { describe, expect, it } from 'vitest';

import {
    mergeRules,
    parseRules,
    RulesetPatchSchema,
    RulesetSchema,
    RulesSystemError,
    safeParseRules,
} from '@/lib/utils/rules/schema';
import { defaultRulesFor } from '@/lib/utils/rules/section-registry';
import { DEFAULT_ADVANCEMENT_RULES } from '@/systems/wfrp/rules/advancement/rules';

const DEFAULT_RULES = defaultRulesFor({ key: 'homm' });

const SYS = { system: { key: 'homm' } };

describe('parseRules', () => {
    it('DEFAULT_RULES збігається з RulesetSchema.parse({ system })', () => {
        expect(DEFAULT_RULES).toEqual(RulesetSchema.parse(SYS));
    });

    it('без system розбір кидає RulesSystemError, без здогадки', () => {
        for (const raw of [
            {},
            null,
            undefined,
            'x',
            42,
            { classes: { enabled: true } },
            { system: { key: 'nope' } },
        ]) {
            expect(() => parseRules(raw)).toThrow(RulesSystemError);
            expect(safeParseRules(raw)).toEqual({
                ok: false,
                error: 'rules.validation.unknownSystem',
            });
        }

        expect(RulesetSchema.safeParse({}).success).toBe(false);
    });

    it("system only → defaults equal to today's constants", () => {
        expect(parseRules(SYS)).toEqual(DEFAULT_RULES);
        expect(safeParseRules(SYS)).toEqual({
            ok: true,
            rules: DEFAULT_RULES,
        });

        expect(DEFAULT_RULES).toEqual({
            morale: { enabled: true, cap: 3 },
            criticals: {
                critOn: 20,
                fumbleOn: 1,
                effects: true,
                doubleDice: false,
                disabledSuccess: [],
                disabledFail: [],
            },
            formulas: {
                saveDcBase: 8,
                proficiencyBase: 2,
                proficiencyEvery: 4,
            },
            heroScaling: {
                meleeDiceByLevel: null,
                rangedDiceByLevel: null,
                hpBaseLevels: 3,
                hpConCoefficient: 1.5,
            },
            initiative: { heroMin: 10, heroMax: 16, mode: 'static' },
            defaultAttacks: {
                meleeName: 'Unarmed Strike',
                rangedName: 'Ranged Attack',
                weaponName: 'Weapon',
            },
            saves: { proficiency: false },
            deathSaves: { enabled: false, unitsDieAtZero: true },
            concentration: { enabled: false, dcCap: null },
            conditions: { enabled: false, exhaustion: '2014' },
            actions: {
                enabled: false,
                opportunityAttacks: true,
                retaliation: true,
                variant: '2014',
            },
            classes: { enabled: false },
            outOfCombat: {
                persistResources: false,
                longRestHitDice: 'half',
                xp: false,
                inspiration: false,
            },
            encounters: { balance: 'fair', edition: '2014', autoXp: false },
            items: { enabled: false, attunementLimit: 3 },
            spellIngredients: { enabled: false, autoPay: true },
            advancement: DEFAULT_ADVANCEMENT_RULES,
            tables: {},
            system: { key: 'homm' },
        });
    });

    it('keeps valid sections and falls back only for a broken one', () => {
        const r = parseRules({
            ...SYS,
            morale: { enabled: false },
            criticals: { critOn: 99 },
        });

        expect(r.morale).toEqual({ enabled: false, cap: 3 });
        expect(r.criticals).toEqual(DEFAULT_RULES.criticals);
    });

    it('drops unknown top-level keys', () => {
        expect(parseRules({ ...SYS, luck: { enabled: true } })).toEqual(
            DEFAULT_RULES
        );
    });

    it('initiative mode defaults to static and accepts roll', () => {
        expect(
            parseRules({ ...SYS, initiative: { heroMin: 1, heroMax: 5 } })
                .initiative.mode
        ).toBe('static');
        expect(
            parseRules({ ...SYS, initiative: { mode: 'roll' } }).initiative.mode
        ).toBe('roll');
        expect(
            RulesetPatchSchema.safeParse({ initiative: { mode: 'bogus' } })
                .success
        ).toBe(false);
    });

    it('falls back for inverted initiative range', () => {
        expect(
            parseRules({ ...SYS, initiative: { heroMin: 20, heroMax: 10 } })
                .initiative
        ).toEqual(DEFAULT_RULES.initiative);
    });
});

describe('RulesetPatchSchema', () => {
    it('accepts a partial section, rejects out-of-range and unknown keys', () => {
        expect(
            RulesetPatchSchema.safeParse({ criticals: { critOn: 19 } }).success
        ).toBe(true);
        expect(
            RulesetPatchSchema.safeParse({ criticals: { critOn: 21 } }).success
        ).toBe(false);
        expect(
            RulesetPatchSchema.safeParse({ criticals: { critOnn: 19 } }).success
        ).toBe(false);
        expect(RulesetPatchSchema.safeParse({ luck: {} }).success).toBe(false);
    });

    it('initiative min must not exceed max', () => {
        expect(
            RulesetPatchSchema.safeParse({
                initiative: { heroMin: 20, heroMax: 10 },
            }).success
        ).toBe(false);
    });
});

describe('mergeRules', () => {
    it('зливає секції й перевіряє refine на злитому значенні', () => {
        const merged = mergeRules(DEFAULT_RULES, { morale: { cap: 5 } });

        expect(merged).toEqual({
            ok: true,
            rules: { ...DEFAULT_RULES, morale: { enabled: true, cap: 5 } },
        });
        expect(
            mergeRules(DEFAULT_RULES, { initiative: { heroMin: 20 } }).ok
        ).toBe(false);
        expect(
            mergeRules(DEFAULT_RULES, { criticals: { critOn: 30 } }).ok
        ).toBe(false);
    });

    it('частковий патч не скидає сусідні поля секції', () => {
        const patch = RulesetPatchSchema.parse({ morale: { cap: 5 } });

        expect(patch).toEqual({ morale: { cap: 5 } });

        const current = parseRules({
            ...SYS,
            morale: { enabled: false, cap: 3 },
        });

        expect(mergeRules(current, patch)).toMatchObject({
            ok: true,
            rules: { morale: { enabled: false, cap: 5 } },
        });
    });

    it('патч однієї секції не стирає кастомні таблиці та списки', () => {
        const current = parseRules({
            ...SYS,
            heroScaling: { meleeDiceByLevel: { '1': '1d6' } },
            criticals: { disabledSuccess: ['1'] },
        });

        const r = mergeRules(
            current,
            RulesetPatchSchema.parse({
                heroScaling: { hpBaseLevels: 4 },
                criticals: { critOn: 19 },
            })
        );

        expect(r).toMatchObject({
            ok: true,
            rules: {
                heroScaling: {
                    meleeDiceByLevel: { '1': '1d6' },
                    hpBaseLevels: 4,
                },
                criticals: { disabledSuccess: ['1'], critOn: 19 },
            },
        });
    });

    it('фумбл не може бути не нижчим за крит', () => {
        expect(
            mergeRules(DEFAULT_RULES, { criticals: { critOn: 3, fumbleOn: 3 } })
                .ok
        ).toBe(false);
        expect(
            parseRules({ ...SYS, criticals: { critOn: 3, fumbleOn: 3 } })
                .criticals
        ).toEqual(DEFAULT_RULES.criticals);
    });
});

describe('parseRulesCached', () => {
    it("той самий JSON дає той самий об'єкт, інший — новий", async () => {
        const { parseRulesCached } = await import('../schema');

        const a = parseRulesCached({ ...SYS, morale: { enabled: false } });

        expect(parseRulesCached({ ...SYS, morale: { enabled: false } })).toBe(
            a
        );
        expect(
            parseRulesCached({ ...SYS, morale: { enabled: true } })
        ).not.toBe(a);
        expect(() => parseRulesCached(null)).toThrow(RulesSystemError);
    });
});

describe('mergeRules removeCustomConditions', () => {
    const cond = (key: string) => ({
        key,
        name: key,
        description: '',
        markers: [] as never[],
    });

    const current = parseRules({
        ...SYS,
        conditions: {
            enabled: true,
            exhaustion: '2014',
            custom: [cond('custom:a'), cond('custom:b')],
        },
    });

    it('removes only the listed key', () => {
        const r = mergeRules(
            current,
            RulesetPatchSchema.parse({ removeCustomConditions: ['custom:a'] })
        );

        expect(r).toMatchObject({ ok: true });
        expect(r.ok && r.rules.conditions.custom?.map((c) => c.key)).toEqual([
            'custom:b',
        ]);
    });

    it('an unknown key is not an error', () => {
        const r = mergeRules(
            current,
            RulesetPatchSchema.parse({ removeCustomConditions: ['custom:zzz'] })
        );

        expect(r.ok && r.rules.conditions.custom).toHaveLength(2);
    });

    it('adding and removing the same key in one patch is an issue', () => {
        const r = mergeRules(
            current,
            RulesetPatchSchema.parse({
                conditions: { custom: [cond('custom:a')] },
                removeCustomConditions: ['custom:a'],
            })
        );

        expect(r.ok).toBe(false);
        expect(!r.ok && r.issues[0].message).toBe(
            'validation.rulesCustomConflict'
        );
    });

    it('a patch without the field behaves as before', () => {
        const r = mergeRules(
            current,
            RulesetPatchSchema.parse({ morale: { cap: 5 } })
        );

        expect(r.ok && r.rules.conditions.custom).toHaveLength(2);
    });

    it('rejects malformed keys and an empty list', () => {
        expect(
            RulesetPatchSchema.safeParse({ removeCustomConditions: ['nope'] })
                .success
        ).toBe(false);
        expect(
            RulesetPatchSchema.safeParse({ removeCustomConditions: [] }).success
        ).toBe(false);
    });
});

describe('unit group presentation', () => {
    it('persists edits by group key without overwriting other groups or encounter rules', () => {
        const current = parseRules({
            ...SYS,
            encounters: {
                balance: 'xp',
                unitGroups: {
                    'type:beast': {
                        name: 'Beasts',
                        icon: 'https://x/beast.png',
                    },
                },
            },
        });

        const patch = RulesetPatchSchema.parse({
            encounters: {
                unitGroups: { 'type:undead': { name: 'Undead', icon: null } },
            },
        });

        const result = mergeRules(current, patch);

        expect(result).toMatchObject({
            ok: true,
            rules: {
                encounters: {
                    balance: 'xp',
                    unitGroups: {
                        'type:beast': {
                            name: 'Beasts',
                            icon: 'https://x/beast.png',
                        },
                        'type:undead': { name: 'Undead', icon: null },
                    },
                },
            },
        });

        if (result.ok)
            expect(parseRules(result.rules).encounters.unitGroups).toEqual(
                result.rules.encounters.unitGroups
            );
    });

    it('rejects blank names and unsafe image URLs', () => {
        for (const appearance of [
            { name: ' ' },
            { icon: 'javascript:alert(1)' },
        ]) {
            expect(
                RulesetPatchSchema.safeParse({
                    encounters: { unitGroups: { 'type:beast': appearance } },
                }).success
            ).toBe(false);
        }
    });
});
