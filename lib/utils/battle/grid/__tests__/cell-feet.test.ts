import { describe, expect, it } from 'vitest';

import { cellFeetOf } from '../cell-feet';

describe('cellFeetOf', () => {
    it.each([
        ['homm', 5],
        ['dnd5e', 5],
        ['wfrp', 6],
    ] as const)('%s -> %i', (key, feet) => {
        expect(cellFeetOf({ system: { key } })).toBe(feet);
    });
});
