import { describe, expect, it } from 'vitest';

import {
    getHudVisibility,
    toggleHudAll,
    toggleHudBlock,
} from '../useHudVisibility';

describe('hud visibility store', () => {
    it('toggles a single block', () => {
        toggleHudBlock('hero');

        expect(getHudVisibility().collapsed.hero).toBe(true);

        toggleHudBlock('hero');

        expect(getHudVisibility().collapsed.hero).toBe(false);
    });

    it('toggles all blocks without touching per-block state', () => {
        toggleHudBlock('dock');

        toggleHudAll();

        expect(getHudVisibility().all).toBe(true);
        expect(getHudVisibility().collapsed.dock).toBe(true);

        toggleHudAll();

        expect(getHudVisibility().all).toBe(false);
    });
});
