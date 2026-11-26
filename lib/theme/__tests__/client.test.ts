// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ACTIVE_PALETTE_KEY, PALETTE_BOOTSTRAP } from '@/lib/theme/client';

function run(path: string, cached: unknown) {
    window.history.pushState({}, '', path);
    localStorage.setItem(ACTIVE_PALETTE_KEY, JSON.stringify(cached));
    new Function(PALETTE_BOOTSTRAP)();
}

beforeEach(() => {
    document.documentElement.removeAttribute('data-palette');
    document.documentElement.classList.add('dark');
});
afterEach(() => localStorage.clear());

describe('PALETTE_BOOTSTRAP', () => {
    it('maps a legacy cached palette and drops the dark class for light ones', () => {
        run('/campaigns', { userId: 'u', palette: 'frost' });
        expect(document.documentElement.dataset.palette).toBe('parchment');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('maps a legacy dark palette to tavern', () => {
        run('/campaigns', { userId: 'u', palette: 'midnight' });
        expect(document.documentElement.dataset.palette).toBe('tavern');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('ignores unknown ids', () => {
        run('/campaigns', { userId: 'u', palette: 'nope' });
        expect(document.documentElement.hasAttribute('data-palette')).toBe(
            false
        );
    });

    it('does nothing on the landing page', () => {
        run('/', { userId: 'u', palette: 'frost' });
        expect(document.documentElement.hasAttribute('data-palette')).toBe(
            false
        );
    });
});
