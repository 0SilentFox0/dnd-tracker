// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useMapFullscreen } from '../useMapFullscreen';

afterEach(() => {
    document.documentElement.style.overflow = '';
});

describe('useMapFullscreen', () => {
    it('toggle switches full on and off', () => {
        const { result } = renderHook(() => useMapFullscreen());

        act(() => result.current.toggle());

        expect(result.current.full).toBe(true);

        act(() => result.current.toggle());

        expect(result.current.full).toBe(false);
    });

    it('locks page scroll while full and restores the previous overflow on exit', () => {
        document.documentElement.style.overflow = 'scroll';

        const { result } = renderHook(() => useMapFullscreen());

        act(() => result.current.toggle());

        expect(document.documentElement.style.overflow).toBe('hidden');

        act(() => result.current.exit());

        expect(document.documentElement.style.overflow).toBe('scroll');
    });

    it('restores the overflow on unmount', () => {
        const { result, unmount } = renderHook(() => useMapFullscreen());

        act(() => result.current.toggle());
        unmount();

        expect(document.documentElement.style.overflow).toBe('');
    });

    it('exit is a no-op when not full', () => {
        const { result } = renderHook(() => useMapFullscreen());

        act(() => result.current.exit());

        expect(result.current.full).toBe(false);
        expect(document.documentElement.style.overflow).toBe('');
    });
});
