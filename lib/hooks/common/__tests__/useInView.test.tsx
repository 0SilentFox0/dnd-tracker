// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useInView } from '../useInView';

let callback: (entries: { isIntersecting: boolean }[]) => void = () => {};

const disconnect = vi.fn();

class FakeObserver {
    constructor(cb: typeof callback) {
        callback = cb;
    }
    observe = vi.fn();
    disconnect = disconnect;
}

function Probe() {
    const [ref, seen] = useInView<HTMLSpanElement>();

    return <span ref={ref}>{seen ? 'seen' : 'idle'}</span>;
}

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    disconnect.mockClear();
});

describe('useInView', () => {
    it('latches after the first intersection', () => {
        vi.stubGlobal('IntersectionObserver', FakeObserver);

        const { getByText } = render(<Probe />);

        expect(getByText('idle')).toBeTruthy();
        act(() => callback([{ isIntersecting: false }]));
        expect(getByText('idle')).toBeTruthy();
        act(() => callback([{ isIntersecting: true }]));
        expect(getByText('seen')).toBeTruthy();
        expect(disconnect).toHaveBeenCalled();
    });

    it('is seen at once without IntersectionObserver', () => {
        vi.stubGlobal('IntersectionObserver', undefined);

        expect(render(<Probe />).getByText('seen')).toBeTruthy();
    });
});
