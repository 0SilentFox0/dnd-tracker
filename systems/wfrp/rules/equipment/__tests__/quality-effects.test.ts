import { describe, expect, it } from 'vitest';

import type { QualityRef } from '../qualities';
import { qualityEffects } from '../quality-effects';

const roll = { attackRoll: 27, netSl: 2, crit: false, sb: 3, ap: 5 };

const fx = (
    qualities: QualityRef[],
    flaws: QualityRef[] = [],
    r: Partial<typeof roll> = {}
) => qualityEffects({ qualities, flaws }, { ...roll, ...r });

describe('qualityEffects', () => {
    it('no qualities: nothing changes', () => {
        expect(fx([])).toEqual({ effect: { toHit: 0, damage: 0 }, steps: [] });
    });

    it('Damaging raises SL to the units digit of the roll', () => {
        expect(fx([{ key: 'damaging' }])).toMatchObject({
            effect: { damageSl: 5 },
            steps: [{ key: 'damaging', value: 5 }],
        });
        expect(fx([{ key: 'damaging' }], [], { netSl: 9 }).steps).toEqual([]);
    });

    it('Impale adds SB on crit only', () => {
        expect(fx([{ key: 'impale' }], [], { crit: true })).toMatchObject({
            effect: { damage: 3 },
            steps: [{ key: 'impale', value: 3 }],
        });
        expect(fx([{ key: 'impale' }]).effect.damage).toBe(0);
    });

    it('Pummel +2 on crit only', () => {
        expect(fx([{ key: 'pummel' }], [], { crit: true }).effect.damage).toBe(
            2
        );
        expect(fx([{ key: 'pummel' }]).effect.damage).toBe(0);
    });

    it('Penetrating halves AP rounding down', () => {
        expect(fx([{ key: 'penetrating' }]).effect.apIgnored).toBe(2);
        expect(
            fx([{ key: 'penetrating' }], [], { ap: 1 }).effect.apIgnored
        ).toBeUndefined();
    });

    it('Hack ignores 1 AP on crit, never below 0', () => {
        expect(fx([{ key: 'hack' }], [], { crit: true }).effect.apIgnored).toBe(
            1
        );
        expect(
            fx([{ key: 'hack' }], [], { crit: true, ap: 0 }).effect.apIgnored
        ).toBeUndefined();
        expect(fx([{ key: 'hack' }]).effect.apIgnored).toBeUndefined();
    });

    it('Penetrating + Hack together stay within AP', () => {
        expect(
            fx([{ key: 'penetrating' }, { key: 'hack' }], [], {
                crit: true,
                ap: 5,
            }).effect.apIgnored
        ).toBe(3);
        expect(
            fx([{ key: 'penetrating' }, { key: 'hack' }], [], {
                crit: true,
                ap: 1,
            }).effect.apIgnored
        ).toBe(1);
    });

    it('Precise +1 damage SL', () => {
        expect(fx([{ key: 'precise' }]).effect.damageSl).toBe(1);
    });

    it('Undamaging lowers minimum damage to 0', () => {
        expect(fx([], [{ key: 'undamaging' }]).effect.minDamage).toBe(0);
    });

    it('to-hit modifiers', () => {
        expect(fx([{ key: 'accurate' }]).effect.toHit).toBe(10);
        expect(fx([{ key: 'fast' }]).effect.toHit).toBe(5);
        expect(fx([], [{ key: 'imprecise' }]).effect.toHit).toBe(-10);
        expect(fx([], [{ key: 'slow' }]).effect.toHit).toBe(-10);
        expect(
            fx([{ key: 'accurate' }], [{ key: 'imprecise' }]).effect.toHit
        ).toBe(0);
    });

    it('fumble thresholds', () => {
        expect(fx([], [{ key: 'unreliable' }]).effect.fumbleFrom).toBe(96);
        expect(fx([], [{ key: 'dangerous' }]).effect.fumbleFrom).toBe(91);
        expect(
            fx([], [{ key: 'unreliable' }, { key: 'dangerous' }]).effect
                .fumbleFrom
        ).toBe(91);
    });

    it('no effect for Blast, Pistol, Defensive, Reload, unimplemented and valueless-unknown', () => {
        const none = fx(
            [
                { key: 'blast', value: 2 },
                { key: 'pistol' },
                { key: 'defensive' },
                { key: 'wrap' },
                { key: 'inflict', value: 1 },
            ],
            [{ key: 'reload', value: 1 }]
        );

        expect(none).toEqual({ effect: { toHit: 0, damage: 0 }, steps: [] });
    });
});
