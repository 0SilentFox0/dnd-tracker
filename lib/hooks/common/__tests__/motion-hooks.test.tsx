// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    tabDirection,
    useCountUp,
    useGhostValue,
    useTabDirection,
} from '@/lib/hooks/common';

const ORIGINAL = window.matchMedia;

function mockReduced(matches: boolean) {
    window.matchMedia = ((query: string) => ({
        matches,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
    vi.useFakeTimers();
    mockReduced(false);
});

afterEach(() => {
    vi.useRealTimers();
    window.matchMedia = ORIGINAL;
});

describe('useCountUp', () => {
    it('counts from 0 to the target and settles on it', () => {
        const { result } = renderHook(() => useCountUp(40, { duration: 500 }));

        expect(result.current).toBe(0);

        act(() => void vi.advanceTimersByTime(250));
        expect(result.current).toBeGreaterThan(0);
        expect(result.current).toBeLessThan(40);

        act(() => void vi.advanceTimersByTime(400));
        expect(result.current).toBe(40);
    });

    it('tweens to a new target instead of restarting from 0', () => {
        const { result, rerender } = renderHook(
            ({ n }) => useCountUp(n, { duration: 200 }),
            { initialProps: { n: 10 } }
        );

        act(() => void vi.advanceTimersByTime(400));
        rerender({ n: 20 });
        act(() => void vi.advanceTimersByTime(40));
        expect(result.current).toBeGreaterThanOrEqual(10);

        act(() => void vi.advanceTimersByTime(400));
        expect(result.current).toBe(20);
    });

    it('returns the target at once under reduced motion', () => {
        mockReduced(true);

        const { result, rerender } = renderHook(({ n }) => useCountUp(n), {
            initialProps: { n: 17 },
        });

        expect(result.current).toBe(17);
        rerender({ n: 25 });
        expect(result.current).toBe(25);
    });

    it('returns the target at once when disabled', () => {
        const { result } = renderHook(() => useCountUp(9, { enabled: false }));

        expect(result.current).toBe(9);
    });
});

describe('tab direction', () => {
    const order = ['stats', 'combat', 'magic'];

    it('computes direction between ids', () => {
        expect(tabDirection(order, 'stats', 'magic')).toBe(1);
        expect(tabDirection(order, 'magic', 'combat')).toBe(-1);
        expect(tabDirection(order, 'combat', 'combat')).toBe(0);
        expect(tabDirection(order, 'combat', 'nope')).toBe(0);
    });

    it('keeps the direction of the last change', () => {
        const { result, rerender } = renderHook(
            ({ id }) => useTabDirection(order, id),
            { initialProps: { id: 'combat' } }
        );

        expect(result.current).toBe(0);
        rerender({ id: 'magic' });
        expect(result.current).toBe(1);
        rerender({ id: 'stats' });
        expect(result.current).toBe(-1);
    });
});

describe('useGhostValue', () => {
    it('lags on damage, flashes, and clears the flash', () => {
        const { result, rerender } = renderHook(({ hp }) => useGhostValue(hp), {
            initialProps: { hp: 30 },
        });

        expect(result.current).toEqual({ ghost: 30, flash: null });

        rerender({ hp: 20 });
        expect(result.current.ghost).toBe(30);
        expect(result.current.flash).toBe('damage');

        act(() => void vi.advanceTimersByTime(330));
        expect(result.current.flash).toBeNull();
        expect(result.current.ghost).toBe(30);

        act(() => void vi.advanceTimersByTime(200));
        expect(result.current.ghost).toBe(20);
    });

    it('follows healing at once with a heal flash', () => {
        const { result, rerender } = renderHook(({ hp }) => useGhostValue(hp), {
            initialProps: { hp: 10 },
        });

        rerender({ hp: 25 });
        expect(result.current).toEqual({ ghost: 25, flash: 'heal' });
    });

    it('is instant and flash-free under reduced motion', () => {
        mockReduced(true);

        const { result, rerender } = renderHook(({ hp }) => useGhostValue(hp), {
            initialProps: { hp: 30 },
        });

        rerender({ hp: 12 });
        expect(result.current).toEqual({ ghost: 12, flash: null });
    });
});
