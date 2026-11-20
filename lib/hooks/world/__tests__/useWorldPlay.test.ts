// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useWorldPlay } from '../useWorldPlay';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
    usePathname: () => '/campaigns/c1/world',
}));
vi.mock('../useWorldView', () => ({
    useWorldView: () => ({
        data: {
            markers: [{ id: 'k1', kind: 'point', x: 0.2, y: 0.3 }],
            heroes: [],
        },
    }),
}));

afterEach(cleanup);

const esc = () =>
    act(
        () =>
            void document.body.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'Escape',
                    bubbles: true,
                    cancelable: true,
                })
            )
    );

describe('useWorldPlay Esc', () => {
    it('closes the details first, then the bubble, one step per press', () => {
        const { result } = renderHook(() => useWorldPlay('c1', 'm1'));

        act(() => result.current.select('k1'));
        act(() => result.current.details.set(true));

        esc();

        expect(result.current.details.open).toBe(false);
        expect(result.current.selectedMarker?.id).toBe('k1');

        esc();

        expect(result.current.selectedMarker).toBeNull();
    });

    it('ignores Esc typed in a field', () => {
        const { result } = renderHook(() => useWorldPlay('c1', 'm1'));

        act(() => result.current.select('k1'));

        const input = document.body.appendChild(
            document.createElement('input')
        );

        act(
            () =>
                void input.dispatchEvent(
                    new KeyboardEvent('keydown', {
                        key: 'Escape',
                        bubbles: true,
                    })
                )
        );

        expect(result.current.selectedMarker?.id).toBe('k1');

        input.remove();
    });
});
