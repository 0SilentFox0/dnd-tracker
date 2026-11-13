// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { fakeScene } from '@/lib/hooks/battle/__tests__/fake-scene';
import { useMoraleRoll } from '@/systems/morale/hooks/useMoraleRoll';

vi.mock('@/lib/hooks/battle/useFxEnabled', () => ({
    useFxEnabled: () => ({ enabled: false }),
}));

const outcome = (hasExtraTurn: boolean, shouldSkipTurn: boolean) => ({
    moraleResult: {
        hasExtraTurn,
        shouldSkipTurn,
        moralePositive: hasExtraTurn,
        message: '',
    },
});

describe('useMoraleRoll', () => {
    it('resolves the gate, then shows the result, then skips the turn', async () => {
        const scene = fakeScene({ morale: -1 });

        scene.moraleCheck.mockResolvedValue(outcome(false, true));

        const calls: string[] = [];

        const gate = {
            resolve: vi.fn(() => calls.push('resolve')),
            skipTurn: vi.fn(() => calls.push('skipTurn')),
        };

        scene.showResult.mockImplementation(() => calls.push('show'));

        const { result } = renderHook(() => useMoraleRoll(scene.me, gate), {
            wrapper: scene.wrapper,
        });

        await act(async () => result.current.roll(2));

        expect(scene.moraleCheck).toHaveBeenCalledWith({
            participantId: scene.me.basicInfo.id,
            d10Roll: 2,
        });
        expect(gate.resolve).toHaveBeenCalledWith('skip');
        expect(calls).toEqual(['resolve', 'show', 'skipTurn']);
    });

    it('an unchanged morale only toasts and does not skip', async () => {
        const scene = fakeScene({ morale: 2 });

        scene.moraleCheck.mockResolvedValue(outcome(false, false));

        const gate = { resolve: vi.fn(), skipTurn: vi.fn() };

        const { result } = renderHook(() => useMoraleRoll(scene.me, gate), {
            wrapper: scene.wrapper,
        });

        await act(async () => result.current.roll(4));

        expect(gate.resolve).toHaveBeenCalledWith('none');
        expect(scene.toast.show).toHaveBeenCalled();
        expect(scene.showResult).not.toHaveBeenCalled();
        expect(gate.skipTurn).not.toHaveBeenCalled();
    });

    it('a failed mutation leaves the gate untouched', async () => {
        const scene = fakeScene({ morale: 2 });

        scene.moraleCheck.mockRejectedValue(new Error('boom'));

        const gate = { resolve: vi.fn(), skipTurn: vi.fn() };

        const { result } = renderHook(() => useMoraleRoll(scene.me, gate), {
            wrapper: scene.wrapper,
        });

        await act(async () => result.current.roll(4));

        expect(gate.resolve).not.toHaveBeenCalled();
    });
});
