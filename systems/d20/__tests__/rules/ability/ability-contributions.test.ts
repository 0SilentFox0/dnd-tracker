import { describe, expect, it } from 'vitest';

import { ABILITY_KEYS } from '@/lib/constants/abilities';
import { PROFICIENCY_KINDS } from '@/lib/constants/artifacts';
import { DND_SKILLS } from '@/lib/constants/skills';
import { buildRecipe } from '@/lib/utils/abilities/templates';
import type { RecipeContext } from '@/lib/utils/abilities/templates/types';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { RulesMergeError } from '@/lib/utils/rules/sections';
import { D20_FLAG_ROWS } from '@/systems/d20/rules/ability-flag-rows';
import { D20_FLAG_SCHEMAS } from '@/systems/d20/rules/ability-flags';
import { D20_ABILITY_RECIPES } from '@/systems/d20/rules/ability-recipes';
import { D20_ABILITY_VARIABLES } from '@/systems/d20/rules/ability-variables';
import { isFiveE } from '@/systems/d20/rules/damage-model';
import { D20_SCENE } from '@/systems/d20/rules/scene-state';
import { D20_SECTIONS } from '@/systems/d20/rules/sections';
import type { BattleParticipant } from '@/types/battle';

const recipe = (id: string) => {
    const found = D20_ABILITY_RECIPES.find((r) => r.id === id);

    if (!found) throw new Error(id);

    return found;
};

const ctx = (scope: RecipeContext['scope']): RecipeContext => ({
    scope,
    name: 'n',
    note: 't',
});

const parse = (flag: Record<string, unknown>) => {
    for (const schema of D20_FLAG_SCHEMAS) {
        const r = schema.safeParse({ kind: 'flag', ...flag });

        if (r.success) return true;
    }

    return false;
};

describe('D20_ABILITY_VARIABLES', () => {
    const p: BattleParticipant = createMockParticipant({
        abilities: {
            ...createMockParticipant().abilities,
            modifiers: {
                strength: 3,
                dexterity: -1,
                constitution: 2,
                intelligence: 0,
                wisdom: 4,
                charisma: -2,
            },
            proficiencyBonus: 5,
        },
    });

    it.each([
        ['str_mod', 3],
        ['dex_mod', -1],
        ['con_mod', 2],
        ['int_mod', 0],
        ['wis_mod', 4],
        ['cha_mod', -2],
        ['prof', 5],
    ])('%s reads %i from the participant', (name, value) => {
        expect(D20_ABILITY_VARIABLES[name](p)).toBe(value);
    });

    it('prof falls back to 0 without a proficiency bonus', () => {
        const q = createMockParticipant();

        q.abilities = {
            ...q.abilities,
            proficiencyBonus: undefined as unknown as number,
        };

        expect(D20_ABILITY_VARIABLES.prof(q)).toBe(0);
    });
});

describe('isFiveE', () => {
    it('is true only for the 5e damage model', () => {
        const mk = (model?: string) =>
            createMockParticipant({
                abilities: {
                    ...createMockParticipant().abilities,
                    damageModel: model as never,
                },
            });

        expect(isFiveE(mk('5e'))).toBe(true);
        expect(isFiveE(mk('flat'))).toBe(false);
        expect(isFiveE(mk(undefined))).toBe(false);
    });
});

describe('D20_SCENE slot', () => {
    it('reads only its own key and only record data', () => {
        expect(D20_SCENE.read({ key: 'd20', data: { a: 1 } })).toEqual({
            a: 1,
        });
        expect(D20_SCENE.read({ key: 'wfrp', data: { a: 1 } })).toBeUndefined();
        expect(D20_SCENE.read({ key: 'd20', data: [1] })).toBeUndefined();
        expect(D20_SCENE.read({ key: 'd20', data: 'x' })).toBeUndefined();
        expect(D20_SCENE.read(undefined)).toBeUndefined();
    });
});

describe('D20_FLAG_SCHEMAS', () => {
    it('accepts every valid ability, skill and proficiency kind', () => {
        for (const a of ABILITY_KEYS)
            expect(parse({ flag: 'saveProficiency', abilities: [a] })).toBe(
                true
            );

        for (const s of DND_SKILLS) {
            expect(parse({ flag: 'skillProficiency', skills: [s] })).toBe(true);
            expect(parse({ flag: 'skillExpertise', skills: [s] })).toBe(true);
        }

        for (const k of PROFICIENCY_KINDS)
            expect(parse({ flag: 'proficiency', kinds: [k] })).toBe(true);
    });

    it('rejects empty lists, unknown values and unknown flags', () => {
        expect(parse({ flag: 'saveProficiency', abilities: [] })).toBe(false);
        expect(parse({ flag: 'saveProficiency', abilities: ['luck'] })).toBe(
            false
        );
        expect(parse({ flag: 'skillExpertise', skills: ['juggling'] })).toBe(
            false
        );
        expect(parse({ flag: 'proficiency', kinds: [] })).toBe(false);
        expect(parse({ flag: 'nope', abilities: ['wisdom'] })).toBe(false);
    });
});

describe('D20_FLAG_ROWS', () => {
    it('defaults are valid per the matching schema', () => {
        expect(
            parse({
                flag: 'saveProficiency',
                ...D20_FLAG_ROWS.saveProficiency.defaults,
            })
        ).toBe(true);
        expect(
            parse({
                flag: 'skillProficiency',
                ...D20_FLAG_ROWS.skillProficiency.defaults,
            })
        ).toBe(true);
        expect(
            parse({
                flag: 'skillExpertise',
                ...D20_FLAG_ROWS.skillExpertise.defaults,
            })
        ).toBe(true);
        expect(
            parse({
                flag: 'proficiency',
                ...D20_FLAG_ROWS.proficiency.defaults,
            })
        ).toBe(true);
    });

    it('describe yields one segment per row and carries the chosen values', () => {
        const save = D20_FLAG_ROWS.saveProficiency.describe({
            kind: 'flag',
            flag: 'saveProficiency',
            abilities: ['wisdom', 'dexterity'],
        } as never);

        const prof = D20_FLAG_ROWS.proficiency.describe({
            kind: 'flag',
            flag: 'proficiency',
            kinds: ['heavy', 'light'],
        } as never);

        expect(save).toHaveLength(1);
        expect(JSON.stringify(save)).toContain('wisdom');
        expect(JSON.stringify(save)).toContain('dexterity');
        expect(prof).toHaveLength(1);
        expect(JSON.stringify(prof)).toContain('options.kinds.heavy');
        expect(JSON.stringify(prof)).toContain('options.kinds.light');
    });
});

describe('D20_ABILITY_RECIPES', () => {
    it('spellSlots grants the chosen count at the chosen level as a passive', () => {
        const res = buildRecipe(
            recipe('spellSlots'),
            { level: 3, count: 2 },
            ctx('ability')
        );

        if (!res.ok || !('ability' in res.result)) throw new Error('shape');

        expect(res.result.ability.trigger).toEqual({ event: 'passive' });
        expect(res.result.ability.effects[0]).toMatchObject({
            kind: 'modifyStat',
            stat: 'spellSlots',
            spellLevels: [3],
            flat: 2,
        });
    });

    it('spellSlots clamps the count to 5 and the level to its options', () => {
        const res = buildRecipe(
            recipe('spellSlots'),
            { level: 1, count: 99 },
            ctx('ability')
        );

        if (!res.ok || !('ability' in res.result)) throw new Error('shape');

        expect(res.result.ability.effects[0]).toMatchObject({ flat: 5 });
    });

    it('condition applies the chosen condition for the chosen rounds in both scopes', () => {
        const spell = buildRecipe(
            recipe('condition'),
            { condition: 'prone', rounds: 3 },
            ctx('spell')
        );

        if (!spell.ok || !('spell' in spell.result)) throw new Error('shape');

        expect(spell.result.spell[0]).toMatchObject({
            kind: 'applyCondition',
            condition: 'prone',
            duration: { rounds: 3 },
        });

        const ab = buildRecipe(
            recipe('condition'),
            { condition: 'prone', rounds: 3 },
            ctx('ability')
        );

        if (!ab.ok || !('ability' in ab.result)) throw new Error('shape');

        expect(ab.result.ability.limits).toEqual({ perBattle: 1 });
    });

    it('concentrationBuff is a concentration spell effect granting armor', () => {
        const res = buildRecipe(
            recipe('concentrationBuff'),
            { value: 2, rounds: 5 },
            ctx('spell')
        );

        if (!res.ok || !('spell' in res.result)) throw new Error('shape');

        expect(res.result.concentration).toBe(true);
        expect(res.result.spell[0]).toMatchObject({
            kind: 'modifyStat',
            stat: 'armor',
            flat: 2,
            duration: { rounds: 5 },
        });
    });
});

describe('D20_SECTIONS', () => {
    const sections = D20_SECTIONS.sections!;

    it('criticals refine accepts only fumbleOn strictly below critOn (non-numbers skipped)', () => {
        const refine = sections.criticals.refine!;

        expect(refine({ critOn: 20, fumbleOn: 1 })).toBe(true);
        expect(refine({ critOn: 19, fumbleOn: 2 })).toBe(true);
        expect(refine({ critOn: 20, fumbleOn: 20 })).toBe(false);
        expect(refine({ critOn: 2, fumbleOn: 19 })).toBe(false);
        expect(refine({ critOn: 19 })).toBe(true);
    });

    it('initiative refine accepts heroMin <= heroMax only (non-numbers skipped)', () => {
        const refine = sections.initiative.refine!;

        expect(refine({ heroMin: 1, heroMax: 20 })).toBe(true);
        expect(refine({ heroMin: 5, heroMax: 5 })).toBe(true);
        expect(refine({ heroMin: 6, heroMax: 5 })).toBe(false);
        expect(refine({ heroMin: 1 })).toBe(true);
    });

    describe('conditions merge', () => {
        const merge = sections.conditions.merge!;

        const c = (key: string, extra = {}) => ({ key, ...extra });

        it('replaces a custom condition with the same key and keeps others in order', () => {
            const { next } = merge(
                { custom: [c('a', { v: 1 }), c('b')] },
                { custom: [c('a', { v: 2 })] },
                {}
            );

            expect(next.custom).toEqual([c('b'), c('a', { v: 2 })]);
        });

        it('removes listed keys and reports custom as touched', () => {
            const { next, touched } = merge(
                { custom: [c('a'), c('b')] },
                {},
                { removeCustomConditions: ['a'] }
            );

            expect(next.custom).toEqual([c('b')]);
            expect(touched).toEqual(['custom']);
        });

        it('reports nothing touched without removals', () => {
            expect(merge({ custom: [c('a')] }, {}, {}).touched).toBeUndefined();
        });

        it('rejects adding and removing the same key in one patch', () => {
            expect(() =>
                merge(
                    { custom: [] },
                    { custom: [c('a')] },
                    { removeCustomConditions: ['a'] }
                )
            ).toThrow(RulesMergeError);
        });

        it('merges scalar fields from the patch over the current section', () => {
            const { next } = merge({ x: 1, y: 2 }, { y: 3 }, {});

            expect(next).toMatchObject({ x: 1, y: 3 });
        });
    });

    it('declares the d20 sections as d20-owned mechanics and extends shared ones', () => {
        for (const s of Object.values(sections)) {
            expect(s.owner).toBe('d20');
            expect(s.mechanic).toBe(true);
        }

        expect(Object.keys(D20_SECTIONS.extend ?? {}).sort()).toEqual([
            'encounters',
            'items',
            'outOfCombat',
        ]);
    });
});
