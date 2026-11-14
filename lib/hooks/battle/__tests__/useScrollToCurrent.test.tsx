// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useScrollToCurrent } from '../useScrollToCurrent';

interface Rect {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

const box = (r: Rect) => () => r as DOMRect;

const OUTER: Rect = { left: 0, top: 0, right: 200, bottom: 200 };

let outer: HTMLDivElement;

let container: HTMLDivElement;

function token(id: string, rect: Rect) {
    const el = document.createElement('div');

    el.dataset.fxAnchor = 'map';
    el.dataset.fxParticipant = id;
    el.getBoundingClientRect = box(rect);
    container.appendChild(el);

    return el;
}

const setup = (currentId: string | null, scrolls = true) =>
    renderHook(
        (props: { id: string | null; scrolls: boolean }) =>
            useScrollToCurrent(
                { current: outer },
                { current: container },
                props.id,
                props.scrolls
            ),
        { initialProps: { id: currentId, scrolls } }
    );

beforeEach(() => {
    outer = document.createElement('div');
    container = document.createElement('div');
    outer.getBoundingClientRect = box(OUTER);
    container.getBoundingClientRect = box(OUTER);
    outer.scrollBy = vi.fn();
});

describe('useScrollToCurrent', () => {
    it('без currentId або без прокрутки — не скролить', () => {
        token('p1', { left: 0, top: 240, right: 40, bottom: 280 });
        setup(null);
        setup('p1', false);

        expect(outer.scrollBy).not.toHaveBeenCalled();
    });

    it('токен усередині видимої зони — не скролить', () => {
        token('p1', { left: 10, top: 10, right: 50, bottom: 50 });
        setup('p1');

        expect(outer.scrollBy).not.toHaveBeenCalled();
    });

    it('токен нижче на 40', () => {
        token('p1', { left: 10, top: 180, right: 50, bottom: 240 });
        setup('p1');

        expect(outer.scrollBy).toHaveBeenCalledWith({
            top: 40,
            left: 0,
            behavior: 'smooth',
        });
    });

    it('токен вище, лівіше, правіше — знак зсуву', () => {
        const el = token('p1', { left: 10, top: -30, right: 50, bottom: 20 });

        setup('p1');
        expect(outer.scrollBy).toHaveBeenLastCalledWith({
            top: -30,
            left: 0,
            behavior: 'smooth',
        });

        el.getBoundingClientRect = box({
            left: -20,
            top: 10,
            right: 30,
            bottom: 50,
        });
        setup('p1');
        expect(outer.scrollBy).toHaveBeenLastCalledWith({
            top: 0,
            left: -20,
            behavior: 'smooth',
        });

        el.getBoundingClientRect = box({
            left: 180,
            top: 10,
            right: 230,
            bottom: 50,
        });
        setup('p1');
        expect(outer.scrollBy).toHaveBeenLastCalledWith({
            top: 0,
            left: 30,
            behavior: 'smooth',
        });
    });

    it('токена з таким id немає — не скролить', () => {
        token('p2', { left: 0, top: 240, right: 40, bottom: 280 });
        setup('p1');

        expect(outer.scrollBy).not.toHaveBeenCalled();
    });

    it('scrolls false → true — скролить', () => {
        token('p1', { left: 10, top: 180, right: 50, bottom: 240 });

        const { rerender } = setup('p1', false);

        expect(outer.scrollBy).not.toHaveBeenCalled();
        rerender({ id: 'p1', scrolls: true });
        expect(outer.scrollBy).toHaveBeenCalledTimes(1);
    });

    it('зміна currentId — скролить до нового токена', () => {
        token('p1', { left: 10, top: 10, right: 50, bottom: 50 });
        token('p2', { left: 10, top: 190, right: 50, bottom: 250 });

        const { rerender } = setup('p1');

        expect(outer.scrollBy).not.toHaveBeenCalled();
        rerender({ id: 'p2', scrolls: true });
        expect(outer.scrollBy).toHaveBeenCalledWith({
            top: 50,
            left: 0,
            behavior: 'smooth',
        });
    });
});
