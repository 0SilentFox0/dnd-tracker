import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
    allSections,
    defaultRulesFor,
    sectionsOfSystem,
    validateSections,
} from '../section-registry';
import {
    extendSection,
    getRule,
    mergeContributions,
    parseSection,
    rulePaths,
    type RulesItem,
    type RulesSection,
    setRule,
} from '../sections';

import { DEFAULT_RULES } from '@/lib/utils/rules/defaults';
import { composition } from '@/lib/utils/rules/systems/catalog';
import { CompositionError } from '@/lib/utils/rules/systems/compose';
import { DEFAULT_ADVANCEMENT_RULES } from '@/systems/wfrp/rules/advancement/rules';

const item = <T>(schema: z.ZodType<T>, def: T): RulesItem<T> => ({
    schema,
    default: def,
});

const section = (
    owner: string,
    items: Record<string, RulesItem>
): RulesSection => ({ owner, mechanic: true, items });

describe('sectionsOf', () => {
    it('dnd5e + morale module sees section morale, without the module it does not', () => {
        expect(
            sectionsOfSystem({ key: 'dnd5e', modules: ['morale'] }).morale
        ).toBeDefined();
        expect(
            sectionsOfSystem({ key: 'dnd5e', modules: [] }).morale
        ).toBeUndefined();
    });

    it('retaliation extends actions owned by d20', () => {
        const paths = rulePaths(
            sectionsOfSystem({ key: 'dnd5e', modules: ['retaliation'] })
        );

        expect(paths).toContain('actions.retaliation');
        expect(
            rulePaths(sectionsOfSystem({ key: 'dnd5e', modules: [] }))
        ).not.toContain('actions.retaliation');
    });

    it('wfrp has tables and advancement but no d20 sections', () => {
        const names = Object.keys(sectionsOfSystem({ key: 'wfrp' }));

        expect(names).toEqual(
            expect.arrayContaining([
                'tables',
                'advancement',
                'system',
                'outOfCombat',
            ])
        );
        expect(names).not.toContain('criticals');
    });

    it('homm preset gets morale, heroScaling and retaliation', () => {
        const sections = sectionsOfSystem({ key: 'homm' });

        expect(Object.keys(sections)).toEqual(
            expect.arrayContaining(['morale', 'heroScaling'])
        );
        expect(rulePaths(sections)).toContain('actions.retaliation');
    });

    it('allSections covers every legacy section', () => {
        expect(Object.keys(allSections()).sort()).toEqual(
            [
                'advancement',
                'actions',
                'classes',
                'concentration',
                'conditions',
                'criticals',
                'deathSaves',
                'defaultAttacks',
                'encounters',
                'formulas',
                'heroScaling',
                'initiative',
                'items',
                'morale',
                'outOfCombat',
                'saves',
                'spellIngredients',
                'system',
                'tables',
            ].sort()
        );
    });
});

describe('path collisions', () => {
    const a = {
        id: 'a',
        contribution: {
            sections: { x: section('a', { v: item(z.number(), 1) }) },
        },
    };

    it('two owners of one section fail', () => {
        expect(() =>
            mergeContributions([
                a,
                {
                    id: 'b',
                    contribution: { sections: { x: section('b', {}) } },
                },
            ])
        ).toThrow(CompositionError);
    });

    it('two modules adding the same item fail', () => {
        const ext = (id: string) => ({
            id,
            contribution: { extend: { x: { w: item(z.number(), 0) } } },
        });

        expect(() => mergeContributions([a, ext('b'), ext('c')])).toThrow(
            CompositionError
        );
    });

    it('extending a missing section fails', () => {
        expect(() =>
            mergeContributions([
                { id: 'b', contribution: { extend: { nope: {} } } },
            ])
        ).toThrow(CompositionError);
    });

    it('extendSection rejects an existing item', () => {
        expect(() =>
            extendSection(section('a', { v: item(z.number(), 1) }), {
                v: item(z.number(), 2),
            })
        ).toThrow(CompositionError);
    });
});

describe('getRule / setRule', () => {
    it('reads nested values and returns undefined for missing paths', () => {
        expect(getRule({ morale: { cap: 4 } }, 'morale.cap')).toBe(4);
        expect(
            getRule({ morale: { cap: 4 } }, 'morale.nope.deeper')
        ).toBeUndefined();
        expect(getRule(null, 'morale.cap')).toBeUndefined();
    });

    it('sets immutably, keeping siblings', () => {
        const patch = { morale: { enabled: true } };

        const next = setRule(patch, 'morale.cap', 5);

        expect(next).toEqual({ morale: { enabled: true, cap: 5 } });
        expect(patch).toEqual({ morale: { enabled: true } });
        expect(setRule({}, 'a.b.c', 1)).toEqual({ a: { b: { c: 1 } } });
    });
});

describe('parseSection (per item)', () => {
    const morale = allSections().morale;

    it('morale { enabled: true } without cap keeps enabled and defaults cap', () => {
        expect(parseSection(morale, { enabled: true })).toEqual({
            enabled: true,
            cap: 3,
        });
    });

    it('an invalid item falls back to its own default only', () => {
        expect(parseSection(morale, { enabled: false, cap: 99 })).toEqual({
            enabled: false,
            cap: 3,
        });
    });

    it('extra sub-keys do not fail the section', () => {
        expect(
            parseSection(morale, { enabled: false, cap: 5, bogus: 1 })
        ).toEqual({ enabled: false, cap: 5 });
    });

    it('a scalar item with upgrade reads the old shape', () => {
        const upgradable = section('t', {
            size: {
                schema: z.object({ w: z.number() }),
                default: { w: 1 },
                upgrade: (old) =>
                    typeof old === 'number' ? { w: old } : undefined,
            },
        });

        expect(parseSection(upgradable, { size: 7 })).toEqual({
            size: { w: 7 },
        });
        expect(parseSection(upgradable, { size: 'x' })).toEqual({
            size: { w: 1 },
        });
        expect(parseSection(upgradable, {})).toEqual({ size: { w: 1 } });
    });

    it('legacy retaliation key with the module off does not break actions', () => {
        const actions = sectionsOfSystem({ key: 'dnd5e', modules: [] }).actions;

        expect(
            parseSection(actions, {
                enabled: true,
                opportunityAttacks: false,
                retaliation: false,
                variant: '2024',
            })
        ).toEqual({
            enabled: true,
            opportunityAttacks: false,
            variant: '2024',
        });
    });

    it('a failing refine falls back to the section defaults', () => {
        const initiative = allSections().initiative;

        expect(
            parseSection(initiative, { heroMin: 30, heroMax: 5, mode: 'roll' })
        ).toEqual({ heroMin: 10, heroMax: 16, mode: 'static' });
    });

    it('an optional item without a value stays absent', () => {
        expect(parseSection(allSections().encounters, {})).toEqual({
            balance: 'fair',
            edition: '2014',
            autoXp: false,
        });
    });
});

describe('validateSections', () => {
    it('real compositions have no section collisions', () => {
        for (const key of ['dnd5e', 'homm', 'wfrp'])
            expect(validateSections(composition({ key }))).toEqual([]);
    });

    it('reports a collision as a composition issue instead of throwing', () => {
        const clash = {
            sections: { morale: { owner: 'x', mechanic: true, items: {} } },
        };

        const c = composition({ key: 'homm' });

        const issues = validateSections(
            c,
            Object.fromEntries([c.base, ...c.modules].map((id) => [id, clash]))
        );

        expect(issues).toHaveLength(1);
        expect(issues[0].code).toBe('sectionCollision');
    });
});

describe('defaultRulesFor', () => {
    it('wfrp carries the advancement defaults owned by its section', () => {
        expect(defaultRulesFor({ key: 'wfrp' }).advancement).toEqual(
            DEFAULT_ADVANCEMENT_RULES
        );
    });

    it('dnd5e: core defaults unchanged, system kept', () => {
        const rules = defaultRulesFor({ key: 'dnd5e' });

        expect(rules).toEqual({
            ...DEFAULT_RULES,
            advancement: DEFAULT_ADVANCEMENT_RULES,
            system: { key: 'dnd5e' },
        });
    });
});
