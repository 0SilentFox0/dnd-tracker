// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { fakeScene } from '@/lib/hooks/battle/__tests__/fake-scene';
import { moraleDiceDone } from '@/lib/hooks/battle/morale-dice';
import { usePlayerTurn as useTurn } from '@/lib/hooks/battle/usePlayerTurn';
import { useMoraleRoll } from '@/systems/morale/hooks/useMoraleRoll';

const fx = vi.hoisted(() => ({ enabled: false }));

vi.mock('@/lib/hooks/battle/useFxEnabled', () => ({
    useFxEnabled: () => ({ enabled: fx.enabled }),
}));

// the morale module drives the gate: its roll hook is composed here the way the morale panel does
const usePlayerTurn = (...args: Parameters<typeof useTurn>) => {
    const turn = useTurn(...args);

    const { roll } = useMoraleRoll(args[0], turn.gate);

    return { ...turn, actions: { ...turn.actions, rollMorale: roll } };
};

describe('usePlayerTurn with the morale gate', () => {
    it('мораль ≠ 0 — фаза morale; «додатковий хід» → оверлей і дії', async () => {
        const { me, wrapper, moraleCheck, showResult } = fakeScene({
            morale: 2,
        });

        const { result } = renderHook(() => usePlayerTurn(me), { wrapper });

        expect(result.current.phase).toBe('gate');

        await act(async () => result.current.actions.rollMorale(9));

        expect(moraleCheck).toHaveBeenCalledWith({
            action: 'morale-check',
            body: { participantId: me.basicInfo.id, d10Roll: 9 },
        });
        expect(showResult).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: 'system',
                module: 'morale',
                data: expect.objectContaining({ outcome: 'extra', d10: 9 }),
            })
        );
        expect(result.current.phase).toBe('acting');
    });

    it('з FX оверлей моралі чекає, поки ляже кубик d10', async () => {
        fx.enabled = true;

        const { me, wrapper, showResult } = fakeScene({ morale: 2 });

        const { result } = renderHook(() => usePlayerTurn(me), { wrapper });

        let rolled: Promise<void> | undefined;

        await act(async () => {
            rolled = result.current.actions.rollMorale(9);
        });
        expect(result.current.phase).toBe('acting');
        expect(showResult).not.toHaveBeenCalled();

        await act(async () => {
            moraleDiceDone();
            await rolled;
        });
        expect(showResult).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: 'system',
                module: 'morale',
                data: expect.objectContaining({ outcome: 'extra', d10: 9 }),
            })
        );
        fx.enabled = false;
    });

    it('паніка: перехід ходу через 4 с з версією після перевірки; демонтаж скасовує таймер', async () => {
        vi.useFakeTimers();

        const scene = fakeScene({ morale: -1 });

        scene.moraleCheck.mockResolvedValue({
            moraleResult: {
                hasExtraTurn: false,
                shouldSkipTurn: true,
                moralePositive: false,
                message: '',
            },
        });

        const nextMutate = scene.value.actions.nextTurn.mutate as ReturnType<
            typeof vi.fn
        >;

        const { result, unmount } = renderHook(() => usePlayerTurn(scene.me), {
            wrapper: scene.wrapper,
        });

        await act(async () => result.current.actions.rollMorale(2));
        act(() => vi.advanceTimersByTime(4_100));

        expect(nextMutate).toHaveBeenCalledWith(
            { expectedVersion: 5 },
            expect.anything()
        );

        nextMutate.mockClear();

        const second = renderHook(() => usePlayerTurn(scene.me), {
            wrapper: scene.wrapper,
        });

        await act(async () => second.result.current.actions.rollMorale(2));
        second.unmount();
        act(() => vi.advanceTimersByTime(4_100));

        expect(nextMutate).not.toHaveBeenCalled();

        unmount();
        vi.useRealTimers();
    });

    it('автоперехід після паніки не вдався (409) — дії повертаються, щоб завершити хід вручну', async () => {
        vi.useFakeTimers();

        const scene = fakeScene({ morale: 2 });

        scene.moraleCheck.mockResolvedValue({
            moraleResult: {
                hasExtraTurn: false,
                shouldSkipTurn: true,
                moralePositive: false,
                message: '',
            },
        });

        (
            scene.value.actions.nextTurn.mutate as ReturnType<typeof vi.fn>
        ).mockImplementation(
            (_vars: unknown, opts?: { onError?: () => void }) =>
                opts?.onError?.()
        );

        const { result } = renderHook(() => usePlayerTurn(scene.me), {
            wrapper: scene.wrapper,
        });

        await act(async () => result.current.actions.rollMorale(2));
        expect(result.current.phase).toBe('ended');

        act(() => vi.advanceTimersByTime(4_100));
        expect(result.current.phase).toBe('acting');
        expect(result.current.status.skipped).toBe(true);

        vi.useRealTimers();
    });

    it('паніка: «Завершити хід» без питання «дію не використано»', async () => {
        vi.useFakeTimers();

        const scene = fakeScene({ morale: -1, confirmAnswer: false });

        scene.moraleCheck.mockResolvedValue({
            moraleResult: {
                hasExtraTurn: false,
                shouldSkipTurn: true,
                moralePositive: false,
                message: '',
            },
        });

        (
            scene.value.actions.nextTurn.mutate as ReturnType<typeof vi.fn>
        ).mockImplementation(
            (_vars: unknown, opts?: { onError?: () => void }) =>
                opts?.onError?.()
        );

        const { result } = renderHook(() => usePlayerTurn(scene.me), {
            wrapper: scene.wrapper,
        });

        await act(async () => result.current.actions.rollMorale(2));
        act(() => vi.advanceTimersByTime(4_100));
        vi.useRealTimers();

        await act(async () => result.current.actions.endTurn());

        expect(scene.confirm).not.toHaveBeenCalled();
        expect(scene.nextTurn).toHaveBeenCalledWith({});
    });
});
