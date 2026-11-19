// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCounterNudge } from '../use-counter-window';

import { ApiError } from '@/lib/api/client';
import {
    COUNTER_NUDGE_DM_MS,
    COUNTER_NUDGE_MEMBER_MS,
} from '@/lib/constants/battle';

const mutate = vi.fn();

let scene: ReturnType<typeof makeScene>;

const NOW = Date.parse('2026-11-19T12:00:00.000Z');

const makeScene = (viewer: { isDM: boolean; userId: string }) => ({
    campaignId: 'c',
    battleId: 'b',
    viewer: { readOnly: false, ...viewer },
    battle: {
        initiativeOrder: [
            { basicInfo: { id: 'caster', name: 'Caster', controlledBy: 'u1' } },
        ],
        pendingChoice: {
            kind: 'counter',
            windowId: 'w1',
            actorId: 'caster',
            deadline: new Date(NOW + 10_000).toISOString(),
            offers: [],
        },
    },
});

vi.mock('../useBattleScene', () => ({ useBattleScene: () => scene }));

vi.mock('@/lib/hooks/battles', () => ({
    useCounterWindowOp: () => ({ mutate }),
}));

describe('useCounterNudge', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
        mutate.mockReset();
    });

    afterEach(() => vi.useRealTimers());

    it('requester expires at the deadline', () => {
        scene = makeScene({ isDM: false, userId: 'u1' });
        renderHook(() => useCounterNudge());

        vi.advanceTimersByTime(9_999);
        expect(mutate).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(mutate).toHaveBeenCalledTimes(1);
        expect(mutate.mock.calls[0][0]).toEqual({
            action: 'expire',
            windowId: 'w1',
        });
    });

    it('DM waits 2 s and another member 5 s past the deadline', () => {
        scene = makeScene({ isDM: true, userId: 'dm' });
        renderHook(() => useCounterNudge());

        vi.advanceTimersByTime(10_000 + COUNTER_NUDGE_DM_MS - 1);
        expect(mutate).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(mutate).toHaveBeenCalledTimes(1);

        mutate.mockReset();
        vi.setSystemTime(NOW);
        scene = makeScene({ isDM: false, userId: 'u2' });
        renderHook(() => useCounterNudge());

        vi.advanceTimersByTime(10_000 + COUNTER_NUDGE_MEMBER_MS - 1);
        expect(mutate).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(mutate).toHaveBeenCalledTimes(1);
    });

    it('unmount clears the timer', () => {
        scene = makeScene({ isDM: false, userId: 'u1' });

        const { unmount } = renderHook(() => useCounterNudge());

        unmount();
        vi.advanceTimersByTime(60_000);

        expect(mutate).not.toHaveBeenCalled();
    });

    it('retries once after a 422 with retryAfterMs', () => {
        scene = makeScene({ isDM: false, userId: 'u1' });
        mutate.mockImplementationOnce((_body, opts) =>
            opts.onError(
                new ApiError('x', 422, '/u', { params: { retryAfterMs: 300 } })
            )
        );
        renderHook(() => useCounterNudge());

        vi.advanceTimersByTime(10_000);
        expect(mutate).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(350);
        expect(mutate).toHaveBeenCalledTimes(2);
    });
});
