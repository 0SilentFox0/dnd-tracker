import { describe, expect, it } from 'vitest';

import { isFullBleedRoute, shouldUseGameShell } from '../game-shell-route';

describe('shouldUseGameShell', () => {
    it('enables the shell for the campaign list, dashboard, journal and both world views', () => {
        expect(shouldUseGameShell('/campaigns')).toBe(true);
        expect(shouldUseGameShell('/campaigns/campaign-1')).toBe(true);
        expect(shouldUseGameShell('/campaigns/campaign-1/')).toBe(true);
        expect(shouldUseGameShell('/campaigns/campaign-1/journal')).toBe(
            true
        );
        expect(shouldUseGameShell('/campaigns/campaign-1/world')).toBe(
            true
        );
        expect(
            shouldUseGameShell('/campaigns/campaign-1/dm/world/')
        ).toBe(true);
        expect(
            shouldUseGameShell('/campaigns/campaign-1/character')
        ).toBe(false);
        expect(
            shouldUseGameShell('/campaigns/campaign-1/battles/battle-1')
        ).toBe(false);
        expect(shouldUseGameShell('/campaigns/new')).toBe(false);
        expect(shouldUseGameShell(null)).toBe(false);
    });
});

describe('isFullBleedRoute', () => {
    it('is true only for a single battle screen', () => {
        expect(isFullBleedRoute('/campaigns/c1/battles/b1')).toBe(true);
        expect(isFullBleedRoute('/campaigns/c1/battles/b1/')).toBe(true);
        expect(isFullBleedRoute('/campaigns/c1/battles')).toBe(false);
        expect(isFullBleedRoute('/campaigns/new')).toBe(false);
        expect(isFullBleedRoute('/campaigns/c1')).toBe(false);
        expect(isFullBleedRoute(null)).toBe(false);
    });
});
