// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDebouncedCommit } from '@/lib/hooks/common';

beforeEach(() => vi.useFakeTimers());

afterEach(() => vi.useRealTimers());

describe('useDebouncedCommit', () => {
    it('commits only the last value after the delay', () => {
        const commit = vi.fn();

        const { result } = renderHook(() => useDebouncedCommit(commit, 400));

        act(() => {
            result.current.schedule('a');
            result.current.schedule('b');
        });
        act(() => void vi.advanceTimersByTime(399));
        expect(commit).not.toHaveBeenCalled();

        act(() => void vi.advanceTimersByTime(1));
        expect(commit).toHaveBeenCalledTimes(1);
        expect(commit).toHaveBeenCalledWith('b');
    });

    it('flushes the pending value on unmount, including null', () => {
        const commit = vi.fn();

        const { result, unmount } = renderHook(() =>
            useDebouncedCommit<string | null>(commit)
        );

        act(() => result.current.schedule(null));
        unmount();
        expect(commit).toHaveBeenCalledWith(null);
    });

    it('uses the latest commit after a rerender', () => {
        const first = vi.fn();

        const second = vi.fn();

        const { result, rerender } = renderHook(
            ({ fn }) => useDebouncedCommit(fn),
            { initialProps: { fn: first } }
        );

        act(() => result.current.schedule(1));
        rerender({ fn: second });
        act(() => void vi.advanceTimersByTime(400));
        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledWith(1);
    });
});
