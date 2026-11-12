// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { fakeScene } from './fake-scene';

import { useInitiativeOrder, useTrackReorder } from '@/lib/hooks/battle';

describe('useInitiativeOrder', () => {
    it('move edits the draft; moving back clears isChanged', () => {
        const { result } = renderHook(() =>
            useInitiativeOrder(['a', 'b', 'c'])
        );

        expect(result.current.isChanged).toBe(false);

        act(() => result.current.move('c', 0));

        expect(result.current.order).toEqual(['c', 'a', 'b']);
        expect(result.current.isChanged).toBe(true);

        act(() => result.current.move('c', 2));

        expect(result.current.isChanged).toBe(false);
    });
});

describe('useTrackReorder', () => {
    it('is available only to the DM of an active battle', () => {
        const dm = fakeScene({ isDM: true });

        expect(
            renderHook(() => useTrackReorder(), { wrapper: dm.wrapper }).result
                .current
        ).toBeTypeOf('function');

        const player = fakeScene({ isDM: false });

        expect(
            renderHook(() => useTrackReorder(), { wrapper: player.wrapper })
                .result.current
        ).toBeUndefined();

        const prepared = fakeScene({ isDM: true, status: 'prepared' as never });

        expect(
            renderHook(() => useTrackReorder(), { wrapper: prepared.wrapper })
                .result.current
        ).toBeUndefined();
    });
});
