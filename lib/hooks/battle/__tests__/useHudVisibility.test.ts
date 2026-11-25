// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
    getHudVisibility,
    toggleHudAll,
    toggleHudBlock,
    useHudHotkey,
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

describe('useHudHotkey', () => {
    const press = (init: KeyboardEventInit, target: EventTarget = window) =>
        target.dispatchEvent(
            new KeyboardEvent('keydown', { bubbles: true, ...init })
        );

    it('toggles on the physical H key, ignores repeats, typing and dialogs', () => {
        const { unmount } = renderHook(() => useHudHotkey());

        const before = getHudVisibility().all;

        press({ code: 'KeyH', key: 'р' });

        expect(getHudVisibility().all).toBe(!before);

        press({ code: 'KeyH', repeat: true });

        expect(getHudVisibility().all).toBe(!before);

        const input = document.body.appendChild(
            document.createElement('input')
        );

        press({ code: 'KeyH' }, input);

        expect(getHudVisibility().all).toBe(!before);

        const dialog = document.body.appendChild(document.createElement('div'));

        dialog.setAttribute('role', 'dialog');

        press({ code: 'KeyH' }, dialog);

        expect(getHudVisibility().all).toBe(!before);

        unmount();
    });
});
