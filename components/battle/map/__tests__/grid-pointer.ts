import { fireEvent } from '@testing-library/react';

import { UNIT } from '@/lib/utils/battle/grid';

export function stubGridCtm(container: HTMLElement) {
    container.querySelectorAll<SVGSVGElement>('svg[data-fx-grid]').forEach((svg) => {
        svg.getScreenCTM = () =>
            ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) as DOMMatrix;
    });
}

function target(container: HTMLElement) {
    stubGridCtm(container);

    return container.querySelector('[data-grid-hit]') as Element;
}

const coords = (p: { x: number; y: number }) => ({
    clientX: (p.x + 0.5) * UNIT,
    clientY: (p.y + 0.5) * UNIT,
});

export const clickCell = (c: HTMLElement, p: { x: number; y: number }) =>
    fireEvent.click(target(c), coords(p));

export const hoverCell = (c: HTMLElement, p: { x: number; y: number }) =>
    fireEvent.pointerMove(target(c), coords(p));

export const pressCell = (c: HTMLElement, p: { x: number; y: number }) =>
    fireEvent.pointerDown(target(c), {
        ...coords(p),
        isPrimary: true,
        button: 0,
        pointerId: 1,
    });
