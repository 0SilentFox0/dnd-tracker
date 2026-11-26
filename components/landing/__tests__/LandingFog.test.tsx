// @vitest-environment happy-dom
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LandingFog } from '@/components/landing/LandingFog';

const ticker = vi.hoisted(() => ({
    unsubscribe: vi.fn(),
    subscribe: vi.fn(),
}));

vi.mock('@/lib/utils/canvas/ticker', () => ({
    subscribe: ticker.subscribe,
}));

vi.mock('@/lib/utils/canvas/fog/cloud-texture', () => ({
    cloudTexture: () =>
        Object.assign(document.createElement('canvas'), {
            width: 224,
            height: 144,
        }),
}));

function mockMedia(matches: Record<string, boolean>) {
    vi.stubGlobal('matchMedia', (q: string) => ({
        matches: matches[q] ?? false,
        media: q,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    }));
}

const fakeCtx = new Proxy(
    {},
    {
        get: (_, key) =>
            key === 'createLinearGradient' || key === 'createRadialGradient'
                ? () => ({ addColorStop: vi.fn() })
                : vi.fn(),
        set: () => true,
    }
);

const moveListeners = (spy: { mock: { calls: unknown[][] } }) =>
    spy.mock.calls.filter(([type]) => type === 'pointermove').length;

describe('LandingFog', () => {
    beforeEach(() => {
        ticker.subscribe.mockReset().mockReturnValue(ticker.unsubscribe);
        ticker.unsubscribe.mockReset();
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
            fakeCtx as unknown as CanvasRenderingContext2D
        );
        vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
            cb();

            return 1;
        });
        vi.stubGlobal('cancelIdleCallback', vi.fn());
        Object.defineProperty(document, 'readyState', {
            configurable: true,
            get: () => 'complete',
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('starts after first paint, follows the pointer and cleans up', () => {
        mockMedia({});

        const add = vi.spyOn(window, 'addEventListener');

        const remove = vi.spyOn(window, 'removeEventListener');

        const { container, unmount } = render(<LandingFog />);

        const canvas = container.querySelector('canvas');

        expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe(
            'true'
        );
        expect(canvas?.hasAttribute('data-ready')).toBe(true);
        expect(moveListeners(add)).toBe(1);
        expect(ticker.subscribe).toHaveBeenCalledTimes(1);

        act(() => unmount());

        expect(moveListeners(remove)).toBe(1);
        expect(ticker.unsubscribe).toHaveBeenCalled();
    });

    it('drifts without pointer interaction on coarse pointers', () => {
        mockMedia({ '(pointer: coarse)': true });

        const add = vi.spyOn(window, 'addEventListener');

        render(<LandingFog />);

        expect(moveListeners(add)).toBe(0);
        expect(ticker.subscribe).toHaveBeenCalledTimes(1);
    });

    it('paints one static frame with reduced motion', () => {
        mockMedia({ '(prefers-reduced-motion: reduce)': true });

        const add = vi.spyOn(window, 'addEventListener');

        const { container } = render(<LandingFog />);

        expect(
            container.querySelector('canvas')?.hasAttribute('data-ready')
        ).toBe(true);
        expect(moveListeners(add)).toBe(0);
        expect(ticker.subscribe).not.toHaveBeenCalled();
    });
});
