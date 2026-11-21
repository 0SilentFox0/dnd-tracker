import { describe, expect, it } from 'vitest';

import {
    type DbSpell,
    normalizeTemplateRow,
    parseSpellSnapshot,
    planSpellMissile,
    type SpellColumns,
    summarizeSpellPlans,
} from '../backfill-spell-missile-plan';

const oldCols: SpellColumns = {
    dice: 1,
    damageBonus: null,
    casting: { magic: { cn: 4, kind: 'arcane', overcast: 'dice' } },
    executionMode: 'native',
    targeting: { kind: 'enemy', range: 90 },
    spellEffects: [
        { kind: 'dealDamage', amount: { spellRoll: 100 }, damageType: 'magic' },
    ],
};

const newCols: SpellColumns = {
    ...oldCols,
    dice: 0,
    damageBonus: 4,
    casting: {
        magic: { cn: 4, kind: 'arcane', overcast: 'dice', missile: true },
    },
};

const spell = (over: Partial<DbSpell> = {}): DbSpell => ({
    id: 's1',
    campaignId: 'c1',
    name: 'Ember Dart',
    ...oldCols,
    ...over,
});

const targets = { 'Ember Dart': newCols, 'Hearth Spark': newCols };

const olds = { 'Ember Dart': oldCols };

describe('planSpellMissile', () => {
    it('writes a row that still equals the pre-power template row', () => {
        const [plan] = planSpellMissile([spell()], targets, olds);

        expect(plan.action).toBe('write');
        expect(plan.after).toEqual(newCols);
        expect(plan.differs).toEqual(['dice', 'damageBonus', 'casting']);
    });

    it('treats key order and absent defaults as equal', () => {
        const row = spell({
            casting: { magic: { overcast: 'dice', kind: 'arcane', cn: 4 } },
            damageBonus: undefined as unknown as null,
        });

        expect(planSpellMissile([row], targets, olds)[0].action).toBe('write');
    });

    it('reports a DM-edited row instead of overwriting it', () => {
        const [plan] = planSpellMissile([spell({ dice: 3 })], targets, olds);

        expect(plan.action).toBe('divergent');
        expect(plan.after).toBeUndefined();
    });

    it('marks an already migrated row current', () => {
        const [plan] = planSpellMissile(
            [spell({ ...newCols })],
            targets,
            olds
        );

        expect(plan.action).toBe('current');
    });

    it('reports a listed spell with no old row unless it matches the target', () => {
        const row = spell({ name: 'Hearth Spark' });

        expect(planSpellMissile([row], targets, olds)[0].action).toBe(
            'divergent'
        );
        expect(
            planSpellMissile([{ ...row, ...newCols }], targets, olds)[0].action
        ).toBe('current');
    });

    it('ignores spells outside SPELL_POWER or without a template target', () => {
        const rows = [
            spell({ name: 'Homebrew Bolt' }),
            spell({ name: 'Spark Flick' }),
        ];

        expect(planSpellMissile(rows, targets, olds)).toEqual([]);
    });
});

describe('summarizeSpellPlans', () => {
    it('counts writes in campaigns with an active battle', () => {
        const plans = planSpellMissile(
            [
                spell(),
                spell({ id: 's2', campaignId: 'c2' }),
                spell({ id: 's3', dice: 5 }),
            ],
            targets,
            olds
        );

        expect(summarizeSpellPlans(plans, new Set(['c2']))).toEqual({
            write: 2,
            current: 0,
            divergent: 1,
            activeBattle: 1,
        });
    });
});

describe('normalizeTemplateRow', () => {
    it('fills database defaults for absent columns', () => {
        expect(normalizeTemplateRow({ dice: 0 })).toEqual({
            dice: 0,
            damageBonus: null,
            casting: null,
            executionMode: 'native',
            targeting: { kind: 'enemy' },
            spellEffects: [],
        });
    });
});

describe('parseSpellSnapshot', () => {
    it('rejects a foreign file', () => {
        expect(() => parseSpellSnapshot('{"version":1,"kind":"x"}')).toThrow();
    });
});
