// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { usePlayerViewKey } from '@/lib/hooks/common/usePlayerViewKey';

afterEach(() => {
    document.body.innerHTML = '';
});

const press = (init: KeyboardEventInit = {}, target: EventTarget = window) =>
    target.dispatchEvent(
        new KeyboardEvent('keydown', {
            code: 'KeyP',
            key: 'p',
            bubbles: true,
            ...init,
        })
    );

describe('usePlayerViewKey', () => {
    it('toggles on P, also on the Ukrainian layout', () => {
        const onToggle = vi.fn();

        renderHook(() => usePlayerViewKey(onToggle, true));
        press();
        press({ key: 'з' });

        expect(onToggle).toHaveBeenCalledTimes(2);
    });

    it('ignores other keys', () => {
        const onToggle = vi.fn();

        renderHook(() => usePlayerViewKey(onToggle, true));
        press({ code: 'KeyB', key: 'b' });

        expect(onToggle).not.toHaveBeenCalled();
    });

    it.each(['input', 'textarea', 'select'])('ignored in %s', (tag) => {
        const onToggle = vi.fn();

        const el = document.body.appendChild(document.createElement(tag));

        renderHook(() => usePlayerViewKey(onToggle, true));
        press({}, el);

        expect(onToggle).not.toHaveBeenCalled();
    });

    it('ignored in contenteditable', () => {
        const onToggle = vi.fn();

        const el = document.body.appendChild(document.createElement('div'));

        Object.defineProperty(el, 'isContentEditable', { value: true });
        renderHook(() => usePlayerViewKey(onToggle, true));
        press({}, el);

        expect(onToggle).not.toHaveBeenCalled();
    });

    it('ignored while a dialog is open', () => {
        const onToggle = vi.fn();

        const dialog = document.body.appendChild(document.createElement('div'));

        dialog.setAttribute('role', 'dialog');
        renderHook(() => usePlayerViewKey(onToggle, true));
        press();

        expect(onToggle).not.toHaveBeenCalled();
    });

    it.each([
        { ctrlKey: true },
        { metaKey: true },
        { altKey: true },
        { repeat: true },
    ])('ignored with %o', (init) => {
        const onToggle = vi.fn();

        renderHook(() => usePlayerViewKey(onToggle, true));
        press(init);

        expect(onToggle).not.toHaveBeenCalled();
    });

    it('no listener when inactive', () => {
        const onToggle = vi.fn();

        const add = vi.spyOn(window, 'addEventListener');

        renderHook(() => usePlayerViewKey(onToggle, false));
        press();

        expect(onToggle).not.toHaveBeenCalled();
        expect(add).not.toHaveBeenCalledWith('keydown', expect.anything());
    });
});
