import { describe, expect, it } from 'vitest';

import { healWounds } from '../heal';

const base = { current: 3, max: 12, tb: 3, days: 2, multiplier: 1, bonus: 0 };

describe('healWounds', () => {
    it('heals tb per day', () => expect(healWounds(base)).toBe(9));

    it('caps at max', () => expect(healWounds({ ...base, days: 30 })).toBe(12));

    it('does nothing for zero days', () =>
        expect(healWounds({ ...base, days: 0 })).toBe(3));

    it('applies multiplier and bonus', () => {
        expect(healWounds({ ...base, multiplier: 2 })).toBe(12);
        expect(healWounds({ ...base, bonus: 2 })).toBe(11);
    });

    it('keeps full hp', () =>
        expect(healWounds({ ...base, current: 12 })).toBe(12));
});
