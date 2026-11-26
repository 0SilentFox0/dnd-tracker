// @vitest-environment happy-dom
import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlayInView } from '@/components/landing/PlayInView';

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;

function mockObserver() {
    const state = {
        callback: null as Callback | null,
        observe: vi.fn(),
        disconnect: vi.fn(),
    };

    vi.stubGlobal(
        'IntersectionObserver',
        class {
            constructor(cb: Callback) {
                state.callback = cb;
            }

            observe = state.observe;
            disconnect = state.disconnect;
        }
    );

    return state;
}

describe('PlayInView', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('plays only while on screen and disconnects on unmount', () => {
        const io = mockObserver();

        const { container, unmount } = render(
            <PlayInView className="demo" label="Battle">
                <span />
            </PlayInView>
        );

        const el = container.firstElementChild as HTMLElement;

        expect(io.observe).toHaveBeenCalledWith(el);
        expect(el.getAttribute('aria-label')).toBe('Battle');
        expect(el.hasAttribute('data-play')).toBe(false);

        act(() => io.callback?.([{ isIntersecting: true }]));
        expect(el.hasAttribute('data-play')).toBe(true);

        act(() => io.callback?.([{ isIntersecting: false }]));
        expect(el.hasAttribute('data-play')).toBe(false);

        act(() => io.callback?.([{ isIntersecting: true }]));
        unmount();
        expect(io.disconnect).toHaveBeenCalled();
        expect(el.hasAttribute('data-play')).toBe(false);
    });

    it('stays static without IntersectionObserver', () => {
        vi.stubGlobal('IntersectionObserver', undefined);

        const { container } = render(
            <PlayInView>
                <span />
            </PlayInView>
        );

        expect(
            (container.firstElementChild as HTMLElement).hasAttribute(
                'data-play'
            )
        ).toBe(false);
    });
});
