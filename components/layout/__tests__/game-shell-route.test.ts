import { describe, expect, it } from 'vitest';

import { shouldUseGameShell } from '../game-shell-route';

describe('shouldUseGameShell', () => {
    it('enables the shell for the campaign list, dashboard, journal and both world views', () => {
        expect(shouldUseGameShell('/campaigns', true)).toBe(true);
        expect(shouldUseGameShell('/campaigns/campaign-1', true)).toBe(true);
        expect(shouldUseGameShell('/campaigns/campaign-1/', true)).toBe(true);
        expect(shouldUseGameShell('/campaigns/campaign-1/journal', true)).toBe(
            true
        );
        expect(shouldUseGameShell('/campaigns/campaign-1/world', true)).toBe(
            true
        );
        expect(
            shouldUseGameShell('/campaigns/campaign-1/dm/world/', true)
        ).toBe(true);
        expect(
            shouldUseGameShell('/campaigns/campaign-1/character', true)
        ).toBe(false);
        expect(
            shouldUseGameShell('/campaigns/campaign-1/battles/battle-1', true)
        ).toBe(false);
        expect(shouldUseGameShell('/campaigns/new', true)).toBe(false);
    });

    it('keeps the existing header when the temporary flag is off', () => {
        expect(shouldUseGameShell('/campaigns', false)).toBe(false);
        expect(shouldUseGameShell('/campaigns/campaign-1', false)).toBe(false);
        expect(
            shouldUseGameShell('/campaigns/campaign-1/dm/world', false)
        ).toBe(false);
    });
});
