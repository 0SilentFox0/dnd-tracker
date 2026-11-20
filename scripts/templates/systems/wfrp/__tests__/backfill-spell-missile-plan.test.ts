import { describe, expect, it } from 'vitest';

import {
    isWfrpRules,
    planMissileRow,
    planMissiles,
    type SpellRow,
    summarizeMissiles,
} from '../backfill-spell-missile-plan';

const oldBolt = (over: Partial<SpellRow> = {}): SpellRow => ({
    id: 's1',
    campaignId: 'c1',
    slug: 'lance-bolt',
    casting: { magic: { cn: 4, kind: 'arcane', overcast: 'dice' } },
    spellEffects: [
        { kind: 'dealDamage', amount: { spellRoll: 100 }, damageType: 'magic' },
    ],
    dice: 1,
    upcastDice: 1,
    ...over,
});

describe('planMissileRow', () => {
    it('rewrites a row that still equals the old template row', () => {
        const plan = planMissileRow(oldBolt());

        expect(plan.action).toBe('write');
        expect(plan.after).toMatchObject({
            dice: 0,
            upcastDice: null,
            spellEffects: [{ kind: 'dealDamage', amount: 4 }],
            casting: {
                magic: { overcast: 'dice', missile: { wpb: true } },
            },
        });
    });

    it('reports a row the DM changed and does not write it', () => {
        expect(planMissileRow(oldBolt({ dice: 3 })).action).toBe('modified');
        expect(
            planMissileRow(
                oldBolt({
                    spellEffects: [
                        {
                            kind: 'dealDamage',
                            amount: '2d6',
                            damageType: 'magic',
                        },
                    ],
                })
            ).action
        ).toBe('modified');
    });

    it('leaves slugs outside the table untouched', () => {
        expect(planMissileRow(oldBolt({ slug: 'ember-dart' })).action).toBe(
            'unchanged'
        );
    });

    it('is idempotent: the written row plans zero changes', () => {
        const first = planMissileRow(oldBolt());

        const again = planMissileRow(
            oldBolt({
                casting: first.after?.casting,
                spellEffects: first.after?.spellEffects,
                dice: 0,
                upcastDice: null,
            })
        );

        expect(again.action).toBe('unchanged');
    });

    it('counts writes in campaigns with an active battle', () => {
        const plans = planMissiles([
            oldBolt(),
            oldBolt({ id: 's2', campaignId: 'c2' }),
        ]);

        expect(summarizeMissiles(plans, new Set(['c2']))).toMatchObject({
            write: 2,
            activeBattle: 1,
        });
    });
});

describe('isWfrpRules', () => {
    it('accepts wfrp-based campaigns only', () => {
        expect(isWfrpRules({ system: { key: 'wfrp' } })).toBe(true);
        expect(isWfrpRules({ system: { key: 'dnd5e' } })).toBe(false);
        expect(isWfrpRules({})).toBe(false);
    });
});
