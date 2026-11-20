import { describe, expect, it } from 'vitest';

import type { QualityRef } from '../qualities';
import {
    qualityAttackSl,
    qualityDangerousFumble,
    qualityEffects,
    qualityImpaleCrit,
    qualityToHit,
} from '../quality-effects';

const roll = { attackRoll: 27, netSl: 2, crit: false, sb: 3, ap: 5 };

const fx = (
    qualities: QualityRef[],
    flaws: QualityRef[] = [],
    r: Partial<typeof roll> = {}
) => qualityEffects({ qualities, flaws }, { ...roll, ...r }, 'canon');

describe('qualityEffects (canon gear)', () => {
    it('Damaging takes the higher of SL and the units die', () => {
        expect(fx([{ key: 'damaging' }]).steps).toEqual([
            { key: 'damaging', value: 5 },
        ]);
        expect(fx([{ key: 'damaging' }], [], { netSl: 9 }).steps).toEqual([]);
    });

    it('Blast drops SL damage, Damaging adds the whole units die', () => {
        const r = fx([{ key: 'blast', value: 3 }, { key: 'damaging' }]);

        expect(r.effect.noSlDamage).toBe(true);
        expect(r.steps).toEqual([{ key: 'damaging', value: 7 }]);
    });

    it('Penetrating ignores 2 AP, never more than the AP there is', () => {
        expect(fx([{ key: 'penetrating' }]).steps).toEqual([
            { key: 'penetrating', value: 2 },
        ]);
        expect(fx([{ key: 'penetrating' }], [], { ap: 1 }).steps).toEqual([
            { key: 'penetrating', value: 1 },
        ]);
    });

    it('Undamaging doubles the remaining AP and allows 0 damage', () => {
        const r = fx([], [{ key: 'undamaging' }]);

        expect(r.effect.minDamage).toBe(0);
        expect(r.steps).toEqual([{ key: 'undamaging', value: -5 }]);
    });

    it('Undamaging cancels Damaging', () => {
        expect(
            fx([{ key: 'damaging' }], [{ key: 'undamaging' }]).steps
        ).toEqual([{ key: 'undamaging', value: -5 }]);
    });

    it('Hack wears one AP and counts the damage with it already worn', () => {
        const r = fx([{ key: 'hack' }, { key: 'penetrating' }]);

        expect(r.effect.armourWear).toBe(1);
        expect(r.steps).toEqual([
            { key: 'hack', value: 1 },
            { key: 'penetrating', value: 2 },
        ]);
        expect(fx([{ key: 'hack' }], [], { ap: 0 }).effect.armourWear).toBe(
            undefined
        );
    });

    it('Impale and Pummel add no flat damage', () => {
        expect(
            fx([{ key: 'impale' }, { key: 'pummel' }], [], { crit: true }).steps
        ).toEqual([]);
    });

    it('Precise/Imprecise are SL modifiers, Imprecise wins', () => {
        const p = (q: QualityRef[], f: QualityRef[] = []) =>
            qualityAttackSl({ qualities: q, flaws: f }, 'canon');

        expect(p([{ key: 'precise' }])).toEqual({ penalty: 0, onSuccess: 1 });
        expect(p([], [{ key: 'imprecise' }])).toEqual({
            penalty: -1,
            onSuccess: 0,
        });
        expect(p([{ key: 'precise' }], [{ key: 'imprecise' }])).toEqual({
            penalty: -1,
            onSuccess: 0,
        });
        expect(
            qualityToHit(
                { qualities: [], flaws: [{ key: 'imprecise' }] },
                'canon'
            )
        ).toBe(0);
    });

    it('Impale crits on tens, Dangerous fumbles on a 9 in either die', () => {
        const impale = { qualities: [{ key: 'impale' as const }], flaws: [] };

        expect(qualityImpaleCrit(impale, 40, 'canon')).toBe(true);
        expect(qualityImpaleCrit(impale, 41, 'canon')).toBe(false);
        expect(qualityImpaleCrit(impale, 40, 'legacy')).toBe(false);

        const danger = {
            qualities: [],
            flaws: [{ key: 'dangerous' as const }],
        };

        for (const r of [9, 19, 90, 95])
            expect(qualityDangerousFumble(danger, r, 'canon')).toBe(true);

        expect(qualityDangerousFumble(danger, 88, 'canon')).toBe(false);
    });
});
