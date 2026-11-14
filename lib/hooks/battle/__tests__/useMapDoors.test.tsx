// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useMapDoors } from '../useMapDoors';

import type { BattleParticipant } from '@/types/battle';

const hero = { basicInfo: { id: 'hero' } } as BattleParticipant;

const setup = (over: Partial<Parameters<typeof useMapDoors>[0]> = {}) => {
    const mutate = vi.fn();

    const notify = vi.fn();

    const hook = renderHook(() =>
        useMapDoors({
            isDM: false,
            current: hero,
            isMyTurn: true,
            mutation: { mutate },
            notify,
            ...over,
        })
    );

    return { hook, mutate, notify };
};

describe('useMapDoors', () => {
    it('гравець у свій хід: клік шле { edge, open, actorId }', () => {
        const { hook, mutate } = setup();

        act(() => hook.result.current.press('1:1:e', { open: false }));
        expect(mutate).toHaveBeenCalledWith({
            edge: '1:1:e',
            open: true,
            actorId: 'hero',
        });
    });

    it('не свій хід — тост без запиту', () => {
        const { hook, mutate, notify } = setup({ isMyTurn: false });

        act(() => hook.result.current.press('1:1:e', { open: false }));
        expect(mutate).not.toHaveBeenCalled();
        expect(notify).toHaveBeenCalledOnce();
    });

    it('ДМ: клік відкриває меню, дія шле патч і закриває меню', () => {
        const { hook, mutate } = setup({ isDM: true });

        act(() => hook.result.current.press('1:1:e', { open: false }));
        expect(hook.result.current.menu).toBe('1:1:e');
        expect(hook.result.current.showLock).toBe(true);
        act(() => hook.result.current.act('1:1:e', { locked: true }));
        expect(mutate).toHaveBeenCalledWith({ edge: '1:1:e', locked: true });
        expect(hook.result.current.menu).toBeNull();
    });
});
