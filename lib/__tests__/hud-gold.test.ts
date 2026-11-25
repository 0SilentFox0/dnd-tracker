import { describe, expect, it, vi } from 'vitest';

import {
    countHudGold,
    hudGoldProblems,
    readHudGoldExempt,
    scanHudGold,
} from '@/scripts/shared/hud-gold';

vi.setConfig({ testTimeout: 30_000 });

describe('hud-gold ratchet', () => {
    it('gold tokens only fall', () =>
        expect(hudGoldProblems(scanHudGold(), readHudGoldExempt())).toEqual(
            []
        ));

    it.each([
        ['text-hud-gold', 1],
        ['border-hud-gold-strong/40 text-hud-gold-bright', 2],
        ['text-[var(--gold)]', 1],
        ['shadow-[0_0_8px_var(--color-hud-glow)]', 1],
        ['.a { color: var(--hud-gold); }', 1],
        ['text-hud-ink border-hud-line', 0],
    ])('counts %s as %i', (text, n) => expect(countHudGold(text)).toBe(n));

    it('reports growth and stale entries', () =>
        expect(
            hudGoldProblems({ 'a.ts': 3, 'b.ts': 1 }, { 'a.ts': 2, 'c.ts': 1 })
        ).toEqual([
            'new hud-gold: a.ts has 3',
            'new hud-gold: b.ts has 1',
            'lower the entry: c.ts',
        ]));
});
