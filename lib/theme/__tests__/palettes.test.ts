import { describe, expect, it } from 'vitest';

import { isPaletteId, paletteFor } from '@/lib/theme/palettes';

describe('paletteFor', () => {
    it.each(['midnight', 'forest', 'amethyst'])('maps %s to tavern', (id) => {
        expect(paletteFor(id)).toBe('tavern');
    });

    it('maps frost to parchment', () => {
        expect(paletteFor('frost')).toBe('parchment');
    });

    it.each(['tavern', 'parchment'])('keeps %s', (id) => {
        expect(paletteFor(id)).toBe(id);
    });

    it.each(['x', null, 42, 'constructor', '__proto__'])(
        'falls back to tavern for %j',
        (value) => {
            expect(paletteFor(value)).toBe('tavern');
        }
    );
});

describe('isPaletteId', () => {
    it('rejects legacy ids', () => {
        expect(isPaletteId('frost')).toBe(false);
        expect(isPaletteId('parchment')).toBe(true);
    });
});
