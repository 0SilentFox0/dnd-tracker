import { describe, expect, it } from 'vitest';

import { bannerPalette } from '../sheet/SheetIdentityPanel';

describe('bannerPalette', () => {
    it('falls back to crimson without a race colour', () => {
        expect(bannerPalette(null).base).toBe('var(--color-hud-crimson)');
        expect(bannerPalette('red').base).toBe('var(--color-hud-crimson)');
    });

    it('uses the race colour with a contrasting ink', () => {
        expect(bannerPalette('#fff')).toEqual({
            base: '#ffffff',
            ink: '#000000',
        });
        expect(bannerPalette('#102030').ink).toBe('#ffffff');
    });
});
