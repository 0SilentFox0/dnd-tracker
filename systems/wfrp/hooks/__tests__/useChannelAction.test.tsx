// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { fakeScene } from '@/lib/hooks/battle/__tests__/fake-scene';
import { useChannelAction } from '@/systems/wfrp/hooks/useChannelAction';

const setup = () => {
    const scene = fakeScene({ system: 'wfrp' });

    const handlers = { onClose: vi.fn(), onDone: vi.fn() };

    const hook = renderHook(() => useChannelAction(scene.me, handlers), {
        wrapper: scene.wrapper,
    });

    return { scene, handlers, hook };
};

describe('useChannelAction', () => {
    it('a manual roll sends it, then closes and reports done', async () => {
        const { scene, handlers, hook } = setup();

        await act(async () => hook.result.current.actions.roll(42));

        expect(scene.moraleCheck).toHaveBeenCalledWith({
            action: 'channel',
            body: { participantId: scene.me.basicInfo.id, roll: 42 },
        });
        expect(handlers.onClose).toHaveBeenCalledTimes(1);
        expect(handlers.onDone).toHaveBeenCalledTimes(1);
    });

    it('auto asks the server to roll', async () => {
        const { scene, hook } = setup();

        await act(async () => hook.result.current.actions.auto());

        expect(scene.moraleCheck).toHaveBeenCalledWith({
            action: 'channel',
            body: { participantId: scene.me.basicInfo.id, serverRoll: true },
        });
    });

    it('a failure keeps the dialog open with the error, which the next attempt and close reset', async () => {
        const { scene, handlers, hook } = setup();

        scene.moraleCheck.mockRejectedValueOnce(new Error('nope'));

        await act(async () => hook.result.current.actions.auto());

        expect(hook.result.current.view.error).toBe('nope');
        expect(handlers.onClose).not.toHaveBeenCalled();
        expect(handlers.onDone).not.toHaveBeenCalled();

        await act(async () => hook.result.current.actions.auto());
        expect(hook.result.current.view.error).toBeUndefined();

        scene.moraleCheck.mockRejectedValueOnce(new Error('again'));
        await act(async () => hook.result.current.actions.auto());
        expect(hook.result.current.view.error).toBe('again');

        act(() => hook.result.current.actions.close());
        expect(hook.result.current.view.error).toBeUndefined();
        expect(handlers.onClose).toHaveBeenCalledTimes(2);
    });

    it('pending only for the channel action', () => {
        const scene = fakeScene({ system: 'wfrp' });

        const { result, rerender } = renderHook(
            () => useChannelAction(scene.me, { onClose: vi.fn() }),
            { wrapper: scene.wrapper }
        );

        Object.assign(scene.value.actions.system, {
            isPending: true,
            variables: { action: 'morale-check', body: {} },
        });
        rerender();
        expect(result.current.view.pending).toBe(false);

        Object.assign(scene.value.actions.system, {
            variables: { action: 'channel', body: {} },
        });
        rerender();
        expect(result.current.view.pending).toBe(true);
    });
});
