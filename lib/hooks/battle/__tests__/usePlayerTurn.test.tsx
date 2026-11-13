// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { usePlayerTurn } from '../usePlayerTurn';
import { fakeScene } from './fake-scene';

describe('usePlayerTurn', () => {
    it('після вичерпаної дії — відлік; «Залишитись» — назад до дій', () => {
        const { me, wrapper } = fakeScene();

        const { result } = renderHook(() => usePlayerTurn(me), { wrapper });

        act(() => result.current.actions.afterAction());
        expect(result.current.phase).toBe('countdown');

        act(() => result.current.actions.stay());
        expect(result.current.phase).toBe('acting');
    });

    it('«Завершити хід» з невикористаною дією питає підтвердження; «ні» — хід триває', async () => {
        const { me, wrapper, nextTurn, confirm } = fakeScene({
            confirmAnswer: false,
        });

        const { result } = renderHook(() => usePlayerTurn(me), { wrapper });

        await act(async () => result.current.actions.endTurn());

        expect(confirm).toHaveBeenCalled();
        expect(nextTurn).not.toHaveBeenCalled();
        expect(result.current.phase).toBe('acting');
    });

    it('«Завершити хід» після дії — без підтвердження', async () => {
        const scene = fakeScene();

        const used = {
            ...scene.me,
            actionFlags: { ...scene.me.actionFlags, hasUsedAction: true },
        };

        const { result } = renderHook(() => usePlayerTurn(used), {
            wrapper: scene.wrapper,
        });

        await act(async () => result.current.actions.endTurn());

        expect(scene.confirm).not.toHaveBeenCalled();
        expect(scene.nextTurn).toHaveBeenCalledWith({});
    });

    it('невдалий «Завершити хід» лишає дії доступними', async () => {
        const scene = fakeScene();

        const used = {
            ...scene.me,
            actionFlags: { ...scene.me.actionFlags, hasUsedAction: true },
        };

        scene.nextTurn.mockRejectedValueOnce(new Error('Зараз не ваш хід'));

        const { result } = renderHook(() => usePlayerTurn(used), {
            wrapper: scene.wrapper,
        });

        act(() => result.current.actions.afterAction());
        await act(async () =>
            result.current.actions.endTurn().catch(() => undefined)
        );

        expect(result.current.phase).not.toBe('ended');
    });

    it('бій завершився цією дією — відлік не запускається', () => {
        const scene = fakeScene();

        const done = { ...scene.value.readBattle(), status: 'completed' };

        scene.value.readBattle = () => done as never;

        const { result } = renderHook(() => usePlayerTurn(scene.me), {
            wrapper: scene.wrapper,
        });

        act(() => result.current.actions.afterAction());

        expect(result.current.phase).toBe('acting');
    });

    it('голий dnd5e: навіть з мораллю ≠ 0 хід стартує в acting (M1)', () => {
        const { me, wrapper } = fakeScene({ morale: 2, system: 'dnd5e' });

        const { result } = renderHook(() => usePlayerTurn(me), { wrapper });

        expect(result.current.phase).toBe('acting');
    });

    it('результат моралі: без перевірки — undefined; уже перевірена в цьому ході — з pendingMoraleCheck', () => {
        const plain = fakeScene();

        expect(
            renderHook(() => usePlayerTurn(plain.me), {
                wrapper: plain.wrapper,
            }).result.current.gateResult
        ).toBeUndefined();

        const checked = fakeScene({ morale: 2 });

        checked.battle.pendingMoraleCheck = {
            participantId: 'me',
            d10Roll: 9,
            moraleResult: {
                hasExtraTurn: true,
                shouldSkipTurn: false,
                moralePositive: true,
                message: '',
            },
        };

        const { result } = renderHook(() => usePlayerTurn(checked.me), {
            wrapper: checked.wrapper,
        });

        expect(result.current.phase).toBe('acting');
        expect(result.current.gateResult).toBe('extra');
    });
});
