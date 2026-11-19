import { describe, expect, it } from 'vitest';

import { d20CombineResistance } from '../resistance';

import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';

const fiveE = {
    ...DEFAULT_RULES,
    criticals: { ...DEFAULT_RULES.criticals, doubleDice: true },
};

const homm = {
    ...DEFAULT_RULES,
    criticals: { ...DEFAULT_RULES.criticals, doubleDice: false },
};

describe('d20CombineResistance in the 5e damage model', () => {
    it('collapses equal resistances into one', () => {
        expect(d20CombineResistance([50, 50], fiveE)).toBe(50);
    });

    it('cancels resistance and vulnerability', () => {
        expect(d20CombineResistance([50, -100], fiveE)).toBe(0);
    });

    it('keeps a lone vulnerability', () => {
        expect(d20CombineResistance([-100], fiveE)).toBe(-100);
    });

    it('is neutral without flags', () => {
        expect(d20CombineResistance([], fiveE)).toBe(0);
    });
});

describe('d20CombineResistance in the percent model', () => {
    it('sums resistances', () => {
        expect(d20CombineResistance([15, 20], homm)).toBe(35);
    });

    it('sums resistance and vulnerability', () => {
        expect(d20CombineResistance([25, -50], homm)).toBe(-25);
    });
});
