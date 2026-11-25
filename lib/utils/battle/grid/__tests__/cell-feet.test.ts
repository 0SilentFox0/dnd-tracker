import { describe, expect, it } from 'vitest';

import { cellFeetOf, costToDistance } from '../cell-feet';

describe('cellFeetOf', () => {
    it.each([
        ['homm', 5],
        ['dnd5e', 5],
        ['wfrp', 6],
    ] as const)('%s -> %i', (key, feet) => {
        expect(cellFeetOf({ system: { key } })).toBe(feet);
    });
});

describe('costToDistance', () => {
    it('converts cells to feet and half-metre rounded metres', () => {
        expect(costToDistance(6, { system: { key: 'dnd5e' } })).toEqual({
            feet: 30,
            metres: 9,
        });
        expect(costToDistance(1, { system: { key: 'dnd5e' } })).toEqual({
            feet: 5,
            metres: 1.5,
        });
    });

    it('uses yards-based systems through feet', () => {
        const feetPerCell = cellFeetOf({ system: { key: 'wfrp' } });

        const r = costToDistance(3, { system: { key: 'wfrp' } });

        expect(r.feet).toBe(3 * feetPerCell);
        expect(r.metres).toBe(Math.round(r.feet * 0.3048 * 2) / 2);
    });

    it('is zero for zero cost', () => {
        expect(costToDistance(0, { system: { key: 'dnd5e' } })).toEqual({
            feet: 0,
            metres: 0,
        });
    });
});
