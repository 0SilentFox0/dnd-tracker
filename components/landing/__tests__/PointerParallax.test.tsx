// @vitest-environment happy-dom
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PointerParallax } from '@/components/landing/PointerParallax';

function mockMedia(matches: Record<string, boolean>) {
    vi.stubGlobal('matchMedia', (q: string) => ({
        matches: matches[q] ?? false,
        media: q,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    }));
}

describe('PointerParallax', () => {
    let frames: FrameRequestCallback[];

    beforeEach(() => {
        frames = [];
        vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
            frames.push(cb);

            return frames.length;
        });
        vi.stubGlobal('cancelAnimationFrame', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        document.documentElement.removeAttribute('style');
    });

    const flush = (n: number) => {
        for (let i = 0; i < n; i++) {
            const cb = frames.shift();

            if (cb) act(() => cb(i * 16));
        }
    };

    it('moves --mx/--my toward the pointer and cleans up', () => {
        mockMedia({});

        const add = vi.spyOn(window, 'addEventListener');

        const remove = vi.spyOn(window, 'removeEventListener');

        const { unmount } = render(<PointerParallax />);

        act(() => {
            window.dispatchEvent(
                new MouseEvent('pointermove', {
                    clientX: window.innerWidth,
                    clientY: 0,
                })
            );
        });
        flush(20);

        const root = document.documentElement.style;

        expect(Number(root.getPropertyValue('--mx'))).toBeGreaterThan(0);
        expect(Number(root.getPropertyValue('--my'))).toBeLessThan(0);
        expect(add.mock.calls.some((c) => c[0] === 'pointermove')).toBe(true);

        unmount();
        expect(root.getPropertyValue('--mx')).toBe('');
        expect(remove.mock.calls.some((c) => c[0] === 'pointermove')).toBe(
            true
        );
    });

    it('subscribes to nothing on coarse pointers', () => {
        mockMedia({ '(pointer: coarse)': true });

        const add = vi.spyOn(window, 'addEventListener');

        render(<PointerParallax />);
        expect(add.mock.calls.some((c) => c[0] === 'pointermove')).toBe(false);
    });

    it('subscribes to nothing under reduced motion', () => {
        mockMedia({ '(prefers-reduced-motion: reduce)': true });

        const add = vi.spyOn(window, 'addEventListener');

        render(<PointerParallax />);
        expect(add.mock.calls.some((c) => c[0] === 'pointermove')).toBe(false);
    });
});
