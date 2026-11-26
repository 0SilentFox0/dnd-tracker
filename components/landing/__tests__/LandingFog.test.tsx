// @vitest-environment happy-dom
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LandingFog } from '@/components/landing/LandingFog';

const ticker = vi.hoisted(() => ({
    unsubscribe: vi.fn(),
    subscribe: vi.fn(),
}));

const motion = vi.hoisted(() => ({
    acquire: vi.fn(),
    render: vi.fn(),
    release: vi.fn(),
}));

const texture = vi.hoisted(() => vi.fn());

vi.mock('@/lib/utils/canvas/ticker', () => ({
    subscribe: ticker.subscribe,
}));

vi.mock('@/lib/utils/canvas/fog/cloud-motion', () => ({
    acquireCloudMotion: motion.acquire,
}));

vi.mock('@/lib/utils/canvas/fog/cloud-texture', async (original) => ({
    ...(await original<object>()),
    cloudTexture: texture,
}));

const sized = (width: number, height: number) =>
    Object.assign(document.createElement('canvas'), { width, height });

function mockMedia(matches: Record<string, boolean>) {
    vi.stubGlobal('matchMedia', (q: string) => ({
        matches: matches[q] ?? false,
        media: q,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    }));
}

function fakeCtx(overrides: Record<string, unknown> = {}) {
    return new Proxy(
        {},
        {
            get: (_, key) => {
                if (typeof key === 'string' && key in overrides)
                    return overrides[key];

                if (key === 'getImageData')
                    return (_x: number, _y: number, w: number, h: number) => ({
                        data: new Uint8ClampedArray(w * h * 4),
                        width: w,
                        height: h,
                    });

                if (
                    key === 'createLinearGradient' ||
                    key === 'createRadialGradient'
                )
                    return () => ({ addColorStop: vi.fn() });

                return vi.fn();
            },
            set: () => true,
        }
    ) as unknown as CanvasRenderingContext2D;
}

const observers: IntersectionObserverCallback[] = [];

class FakeObserver {
    constructor(cb: IntersectionObserverCallback) {
        observers.push(cb);
    }

    observe = vi.fn();

    disconnect = vi.fn();
}

function intersect(isIntersecting: boolean) {
    act(() =>
        observers.forEach((cb) =>
            cb(
                [{ isIntersecting } as IntersectionObserverEntry],
                {} as IntersectionObserver
            )
        )
    );
}

const moveListeners = (spy: { mock: { calls: unknown[][] } }) =>
    spy.mock.calls.filter(([type]) => type === 'pointermove').length;

const paintFrame = () => {
    const paint = ticker.subscribe.mock.calls.at(-1)?.[0] as (
        now: number,
        dt: number
    ) => void;

    act(() => paint(1000, 1 / 30));
};

describe('LandingFog', () => {
    beforeEach(() => {
        observers.length = 0;
        ticker.subscribe.mockReset().mockReturnValue(ticker.unsubscribe);
        ticker.unsubscribe.mockReset();
        motion.render.mockReset().mockReturnValue(true);
        motion.release.mockReset();
        motion.acquire.mockReset().mockReturnValue({
            canvas: sized(256, 160),
            render: motion.render,
            release: motion.release,
        });
        texture.mockReset().mockImplementation(() => sized(224, 144));
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
            fakeCtx()
        );
        vi.stubGlobal('IntersectionObserver', FakeObserver);
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

    it('flows the shared cloud shader on screen and keeps the context while off screen', () => {
        mockMedia({});

        const { container } = render(<LandingFog />);

        expect(motion.acquire).not.toHaveBeenCalled();

        intersect(true);
        expect(ticker.subscribe).toHaveBeenCalledTimes(1);

        paintFrame();
        expect(motion.acquire).toHaveBeenCalledTimes(1);
        expect(motion.render).toHaveBeenCalledWith(1);
        expect(texture).not.toHaveBeenCalled();
        expect(
            container.querySelector('canvas')?.hasAttribute('data-ready')
        ).toBe(true);

        intersect(false);
        expect(ticker.unsubscribe).toHaveBeenCalled();
        expect(motion.release).not.toHaveBeenCalled();

        intersect(true);
        paintFrame();
        expect(motion.acquire).toHaveBeenCalledTimes(1);
    });

    it('final variant never touches WebGL', () => {
        mockMedia({});

        render(<LandingFog variant="final" />);
        intersect(true);
        paintFrame();

        expect(motion.acquire).not.toHaveBeenCalled();
        expect(texture).toHaveBeenCalledTimes(1);
    });

    it('falls back to the 2D cloud texture without WebGL2 and cleans up', () => {
        mockMedia({});
        motion.acquire.mockReturnValue(null);

        const add = vi.spyOn(window, 'addEventListener');

        const remove = vi.spyOn(window, 'removeEventListener');

        const removeDoc = vi.spyOn(document, 'removeEventListener');

        const { container, unmount } = render(<LandingFog />);

        expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe(
            'true'
        );
        expect(moveListeners(add)).toBe(1);

        intersect(true);
        paintFrame();
        paintFrame();
        expect(motion.acquire).toHaveBeenCalledTimes(1);
        expect(texture).toHaveBeenCalledTimes(1);
        expect(
            container.querySelector('canvas')?.hasAttribute('data-ready')
        ).toBe(true);

        act(() => unmount());

        expect(moveListeners(remove)).toBe(1);
        expect(
            removeDoc.mock.calls.some(([type]) => type === 'visibilitychange')
        ).toBe(true);
        expect(ticker.unsubscribe).toHaveBeenCalled();
    });

    it('releases the shader on unmount', () => {
        mockMedia({});

        const { unmount } = render(<LandingFog />);

        intersect(true);
        paintFrame();
        act(() => unmount());

        expect(motion.release).toHaveBeenCalledTimes(1);
        expect(ticker.unsubscribe).toHaveBeenCalled();
    });

    it('flows without the cursor brush on coarse pointers', () => {
        mockMedia({ '(pointer: coarse)': true });

        const add = vi.spyOn(window, 'addEventListener');

        render(<LandingFog />);
        intersect(true);

        expect(moveListeners(add)).toBe(0);
        expect(ticker.subscribe).toHaveBeenCalledTimes(1);
    });

    it('paints one still shader frame with reduced motion and holds nothing', () => {
        mockMedia({ '(prefers-reduced-motion: reduce)': true });

        const add = vi.spyOn(window, 'addEventListener');

        const { container } = render(<LandingFog />);

        expect(motion.render).toHaveBeenCalledTimes(1);
        expect(motion.render).toHaveBeenCalledWith(0);
        expect(motion.release).toHaveBeenCalledTimes(1);
        expect(
            container.querySelector('canvas')?.hasAttribute('data-ready')
        ).toBe(true);
        expect(moveListeners(add)).toBe(0);
        expect(observers).toHaveLength(0);
        expect(ticker.subscribe).not.toHaveBeenCalled();
    });

    it('final variant clears a hole in the centre', () => {
        mockMedia({ '(prefers-reduced-motion: reduce)': true });

        const radial = vi.fn(() => ({ addColorStop: vi.fn() }));

        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
            fakeCtx({ createRadialGradient: radial })
        );

        const { container } = render(<LandingFog variant="final" />);

        expect(container.firstElementChild?.classList).toContain(
            'ld-fog-final'
        );
        expect(radial).toHaveBeenCalledTimes(1);
    });
});
