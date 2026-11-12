import { describe, expect, it } from 'vitest';

import { stripPlayerHiddenRules } from '../player-hidden';
import { MECHANIC_REGISTRY, mechanicRegistryOf } from '../registry';
import {
    mergeRules,
    parseRules,
    RulesetPatchSchema,
    rulesetPatchSchemaFor,
} from '../schema';
import { allSections, sectionsOfSystem } from '../section-registry';

const merge = (
    raw: Record<string, unknown>,
    patch: Parameters<typeof mergeRules>[1]
) => {
    const result = mergeRules(parseRules(raw), patch, raw);

    if (!result.ok) throw new Error(JSON.stringify(result.issues));

    return result;
};

describe('mergeRules over the raw JSON (D4)', () => {
    it('keeps a foreign section and unknown items', () => {
        const raw = {
            system: { key: 'dnd5e' },
            futureSection: { a: 1 },
            saves: { proficiency: false, legacy: 2 },
        };

        const { stored } = merge(raw, { saves: { proficiency: true } });

        expect(stored).toMatchObject({
            futureSection: { a: 1 },
            saves: { proficiency: true, legacy: 2 },
        });
    });

    it.each([[[]], [['morale']]])(
        'dnd5e with modules %j keeps the morale section in the saved JSON',
        (modules) => {
            const raw = {
                system: { key: 'dnd5e', modules },
                morale: { enabled: true, cap: 4 },
                saves: { proficiency: false },
            };

            const { stored } = merge(raw, { saves: { proficiency: true } });

            expect(stored?.morale).toEqual({ enabled: true, cap: 4 });
            expect(stored?.system).toEqual({ key: 'dnd5e', modules });
        }
    );

    it('merges deep by items: untouched items of a patched section stay as stored', () => {
        const { stored } = merge(
            { system: { key: 'homm' }, morale: { enabled: false, cap: 5 } },
            { morale: { enabled: true } }
        );

        expect(stored?.morale).toEqual({ enabled: true, cap: 5 });
    });

    it('does not materialise defaults of sections it was not asked to change', () => {
        const { stored } = merge(
            { system: { key: 'homm' } },
            { saves: { proficiency: true } }
        );

        expect(Object.keys(stored ?? {}).sort()).toEqual(['saves', 'system']);
    });

    it('resets modules when system.key changes and keeps them otherwise', () => {
        const raw = { system: { key: 'dnd5e', modules: ['morale'] } };

        expect(merge(raw, { system: { key: 'dnd5e' } }).stored?.system).toEqual(
            { key: 'dnd5e', modules: ['morale'] }
        );
        expect(merge(raw, { system: { key: 'homm' } }).stored?.system).toEqual({
            key: 'homm',
        });
        expect(merge(raw, { system: { key: 'homm' } }).rules.system).toEqual({
            key: 'homm',
        });
    });

    it('keeps invalid stored modules raw instead of erasing them', () => {
        const raw = { system: { key: 'dnd5e', modules: ['from-the-future'] } };

        expect(
            merge(raw, { saves: { proficiency: true } }).stored?.system
        ).toEqual({ key: 'dnd5e', modules: ['from-the-future'] });
    });

    it('tables: null removes a slot, other stored slots stay', () => {
        const rows = [{ max: 100, effects: [] }];

        const { stored } = merge(
            {
                system: { key: 'wfrp' },
                tables: { critHead: rows, critArm: rows },
            },
            { tables: { critHead: null } }
        );

        expect(stored?.tables).toEqual({ critArm: rows });
    });

    it('removeCustomConditions writes the filtered list', () => {
        const cond = (key: string) => ({
            key,
            name: 'x',
            description: '',
            markers: [],
        });

        const { stored } = merge(
            {
                system: { key: 'dnd5e' },
                conditions: {
                    enabled: true,
                    custom: [cond('custom:a'), cond('custom:b')],
                },
            },
            { removeCustomConditions: ['custom:a'] }
        );

        expect(stored?.conditions).toMatchObject({
            enabled: true,
            custom: [cond('custom:b')],
        });
    });

    it('without raw there is no stored', () => {
        expect(
            mergeRules(parseRules({}), { saves: { proficiency: true } })
        ).not.toHaveProperty('stored');
    });
});

describe('composition-driven registries', () => {
    it('patch schema follows the sections of the composition', () => {
        const dnd5e = rulesetPatchSchemaFor(sectionsOfSystem({ key: 'dnd5e' }));

        expect(dnd5e.safeParse({ criticals: { critOn: 19 } }).success).toBe(
            true
        );
        expect(dnd5e.safeParse({ morale: { cap: 5 } }).success).toBe(false);
        expect(
            rulesetPatchSchemaFor(
                sectionsOfSystem({ key: 'dnd5e', modules: ['morale'] })
            ).safeParse({ morale: { cap: 5 } }).success
        ).toBe(true);
        expect(
            rulesetPatchSchemaFor(sectionsOfSystem({ key: 'wfrp' })).safeParse({
                criticals: {},
            }).success
        ).toBe(false);
    });

    it('patch refine reports the order message', () => {
        const r = RulesetPatchSchema.safeParse({
            initiative: { heroMin: 20, heroMax: 10 },
        });

        expect(r.success).toBe(false);
        expect(r.error?.issues[0]).toMatchObject({
            message: 'rules.validation.initiativeOrder',
            path: ['initiative'],
        });
    });

    it('MECHANIC_REGISTRY equals the mechanic sections of every owner', () => {
        expect(mechanicRegistryOf(allSections())).toEqual(MECHANIC_REGISTRY);
        expect(
            Object.keys(mechanicRegistryOf(sectionsOfSystem({ key: 'wfrp' })))
        ).not.toContain('morale');
    });

    it('stripPlayerHiddenRules clears exactly the playerHidden sections', () => {
        const rules = parseRules({
            tables: { critHead: [{ max: 100, effects: [] }] },
        });

        expect(stripPlayerHiddenRules(rules)).toEqual({ ...rules, tables: {} });
    });
});
