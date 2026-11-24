import { describe, expect, it } from 'vitest';

import { shouldUseGameShell } from '../game-shell-route';

describe('shouldUseGameShell', () => {
    it('enables the shell for the campaign list, dashboard, journal and both world views', () => {
        expect(shouldUseGameShell('/campaigns')).toBe(true);
        expect(shouldUseGameShell('/campaigns/campaign-1')).toBe(true);
        expect(shouldUseGameShell('/campaigns/campaign-1/')).toBe(true);
        expect(shouldUseGameShell('/campaigns/campaign-1/journal')).toBe(true);
        expect(shouldUseGameShell('/campaigns/campaign-1/world')).toBe(true);
        expect(shouldUseGameShell('/campaigns/campaign-1/dm/world/')).toBe(
            true
        );
        expect(shouldUseGameShell('/campaigns/campaign-1/character')).toBe(
            true
        );
        expect(
            shouldUseGameShell('/campaigns/campaign-1/dm/characters/ch-1')
        ).toBe(true);
        expect(shouldUseGameShell('/campaigns/campaign-1/character/new')).toBe(
            false
        );
        expect(shouldUseGameShell('/campaigns/campaign-1/character/edit')).toBe(
            false
        );
        expect(
            shouldUseGameShell('/campaigns/campaign-1/character/draft')
        ).toBe(false);
        expect(shouldUseGameShell('/campaigns/campaign-1/dm/characters')).toBe(
            false
        );
        expect(
            shouldUseGameShell('/campaigns/campaign-1/dm/characters/new')
        ).toBe(false);
        expect(
            shouldUseGameShell('/campaigns/campaign-1/battles/battle-1')
        ).toBe(false);
        expect(shouldUseGameShell('/campaigns/new')).toBe(false);
        expect(shouldUseGameShell(null)).toBe(false);
    });
});
