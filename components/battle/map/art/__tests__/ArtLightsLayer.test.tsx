// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ArtLightsLayer } from '../ArtLightsLayer';

afterEach(cleanup);

const light = (id: string, x: number) => ({
    id,
    x,
    y: 10,
    radius: 100,
    color: '#fff',
    intensity: 1,
});

describe('ArtLightsLayer', () => {
    it('renders a handle per light', () => {
        const { container } = render(
            <svg>
                <ArtLightsLayer
                    lights={[light('a', 1), light('b', 2)]}
                    editing={{ selectedId: null, select: vi.fn(), move: vi.fn() }}
                />
            </svg>
        );

        expect(container.querySelectorAll('[data-art-light]')).toHaveLength(2);
    });

    it('drag selects and moves in svg units', () => {
        const select = vi.fn();

        const move = vi.fn();

        const { container } = render(
            <svg>
                <ArtLightsLayer
                    lights={[light('a', 1)]}
                    editing={{ selectedId: 'a', select, move }}
                />
            </svg>
        );

        const svg = container.querySelector('svg') as SVGSVGElement;

        svg.getScreenCTM = () =>
            ({ inverse: () => ({}) }) as unknown as DOMMatrix;
        svg.createSVGPoint = () =>
            ({
                x: 0,
                y: 0,
                matrixTransform() {
                    return { x: (this as { x: number }).x / 2, y: (this as { y: number }).y / 2 };
                },
            }) as unknown as DOMPoint;

        const el = container.querySelector('[data-art-light]') as SVGCircleElement;

        el.setPointerCapture = vi.fn();
        el.hasPointerCapture = () => true;

        fireEvent.pointerDown(el, { pointerId: 1 });
        fireEvent.pointerMove(el, { pointerId: 1, clientX: 40, clientY: 20 });

        expect(select).toHaveBeenCalledWith('a');
        expect(move).toHaveBeenCalledWith('a', { x: 20, y: 10 });
    });
});
