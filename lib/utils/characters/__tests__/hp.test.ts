import { describe, expect, it } from 'vitest';

import { applyHpChange } from '@/lib/utils/characters/hp';

const s = { hp: 10, max: 20, temp: 5 };

describe('applyHpChange', () => {
    it('damage eats temp first', () => {
        expect(applyHpChange(s, { kind: 'damage', amount: 3 })).toEqual({
            hp: 10,
            tempHp: 2,
        });
        expect(applyHpChange(s, { kind: 'damage', amount: 8 })).toEqual({
            hp: 7,
            tempHp: 0,
        });
    });

    it('damage floors hp at 0', () => {
        expect(applyHpChange(s, { kind: 'damage', amount: 99 }).hp).toBe(0);
    });

    it('heal caps at max and keeps temp', () => {
        expect(applyHpChange(s, { kind: 'heal', amount: 99 })).toEqual({
            hp: 20,
            tempHp: 5,
        });
    });

    it('temp does not stack', () => {
        expect(applyHpChange(s, { kind: 'temp', amount: 3 }).tempHp).toBe(5);
        expect(applyHpChange(s, { kind: 'temp', amount: 9 }).tempHp).toBe(9);
    });

    it('treats negative and NaN as 0', () => {
        expect(applyHpChange(s, { kind: 'damage', amount: -4 })).toEqual({
            hp: 10,
            tempHp: 5,
        });
        expect(applyHpChange(s, { kind: 'heal', amount: NaN }).hp).toBe(10);
    });
});
