import { describe, expect, it } from 'vitest';

import { DEFAULT_CHARACTERISTICS } from '../../characteristics/keys';
import { advancementFor, CANON_ADVANCE_MAX, CANON_TALENT_COST } from '../canon';
import { advanceCost, advanceTarget, talentCost } from '../cost';
import { DEFAULT_ADVANCEMENT_RULES } from '../defaults';
import { planPurchase } from '../plan';

const CANON = { xpTables: 'canon5e' } as const;

const LEGACY_STORED = DEFAULT_ADVANCEMENT_RULES;

describe('advancementFor', () => {
    it('legacy edition keeps stored rules untouched', () => {
        expect(advancementFor(LEGACY_STORED, { xpTables: 'legacy' })).toBe(
            LEGACY_STORED
        );
    });

    it('canon5e replaces legacy +1 brackets and max with the canon tables', () => {
        const r = advancementFor(LEGACY_STORED, CANON);

        expect(r.characteristic.brackets[0]).toEqual({ upTo: 1, cost: 125 });
        expect(r.skill.brackets[0]).toEqual({ upTo: 1, cost: 50 });
        expect(r.characteristic.max).toBe(CANON_ADVANCE_MAX);
        expect(r.talentCostMultiplier).toBe(1);
    });

    it('canon5e keeps purchase-indexed tables a DM customised', () => {
        const custom = {
            ...LEGACY_STORED,
            characteristic: {
                brackets: [{ upTo: 1, cost: 999 }],
                max: 50,
            },
        };

        const r = advancementFor(custom, CANON);

        expect(r.characteristic).toBe(custom.characteristic);
        expect(r.skill.brackets[0].cost).toBe(50);
    });

    it('a canon5e campaign with legacy brackets does not buy +5 at 25 XP', () => {
        const rules = advancementFor(LEGACY_STORED, CANON);

        const r = planPurchase({
            characteristics: DEFAULT_CHARACTERISTICS,
            available: 1000,
            request: { kind: 'characteristic', key: 'ws' },
            rules,
            step: 5,
            now: 't',
            id: 'i',
        });

        expect(r.ok && r.entry).toMatchObject({ from: 0, to: 5, cost: 125 });
    });

    it('talents cost a flat 100 under canon whatever the stored xpCost', () => {
        expect(talentCost(150, 0, LEGACY_STORED, true)).toBe(CANON_TALENT_COST);
        expect(talentCost(150, 2, LEGACY_STORED, true)).toBe(CANON_TALENT_COST);
        expect(talentCost(150, 1, LEGACY_STORED)).toBe(300);

        const r = planPurchase({
            characteristics: DEFAULT_CHARACTERISTICS,
            available: 500,
            request: { kind: 'talent', key: 't1' },
            rules: advancementFor(LEGACY_STORED, CANON),
            flatTalent: true,
            talent: { id: 't1', xpCost: 150, maxRank: 1 },
            now: 't',
            id: 'i',
        });

        expect(r.ok && r.entry.cost).toBe(100);
    });
});

describe('purchase target near the limit', () => {
    const rules = advancementFor(LEGACY_STORED, CANON);

    it('snaps to the next multiple of step and rejects past max', () => {
        expect(advanceTarget(3, 75, 5)).toBe(5);
        expect(advanceTarget(73, 75, 5)).toBe(75);
        expect(advanceTarget(75, 75, 5)).toBeNull();
        expect(advanceTarget(70, 72, 5)).toBeNull();
        expect(advanceTarget(4, 40, 1)).toBe(5);
        expect(advanceTarget(40, 40, 1)).toBeNull();
    });

    it('prices an off-grid value by its purchase index', () => {
        expect(advanceCost('skill', 3, rules, 5)).toBe(50);
        expect(advanceCost('skill', 73, rules, 5)).toBe(8500);
    });

    it.each([
        [3, 5],
        [73, 75],
    ])('plan from %i lands on %i', (from, to) => {
        const r = planPurchase({
            characteristics: {
                ...DEFAULT_CHARACTERISTICS,
                skillAdvances: { melee: from },
            },
            available: 1e6,
            request: { kind: 'skill', key: 'melee' },
            rules,
            step: 5,
            now: 't',
            id: 'i',
        });

        expect(r.ok && r.entry).toMatchObject({ from, to });
        expect(r.ok && r.next.skillAdvances.melee).toBe(to);
    });

    it('rejects a purchase that would overshoot max', () => {
        const r = planPurchase({
            characteristics: {
                ...DEFAULT_CHARACTERISTICS,
                skillAdvances: { melee: 70 },
            },
            available: 1e6,
            request: { kind: 'skill', key: 'melee' },
            rules: { ...rules, skill: { ...rules.skill, max: 72 } },
            step: 5,
            now: 't',
            id: 'i',
        });

        expect(r).toEqual({ ok: false, error: 'AT_LIMIT' });
    });
});
