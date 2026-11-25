import { describe, expect, it, vi } from 'vitest';

import { countHudGold, scanHudGold } from '@/scripts/shared/hud-gold';

const G = ['hud', 'gold'].join('-');

vi.setConfig({ testTimeout: 30_000 });

describe('hud-gold ban', () => {
    it('no gold tokens outside the scenario book and fx', () =>
        expect(scanHudGold()).toEqual({}));

    it.each([
        [`text-${G}`, 1],
        [`border-${G}-strong/40 text-${G}-bright`, 2],
        ['text-[var(--' + 'gold)]', 1],
        ['shadow-[0_0_8px_var(--color-hud-' + 'glow)]', 1],
        [`.a { color: var(--${G}); }`, 1],
        ['text-hud-ink border-hud-line', 0],
    ])('counts %s as %i', (text, n) => expect(countHudGold(text)).toBe(n));
});
