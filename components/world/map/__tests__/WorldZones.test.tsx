// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { WorldZones } from '../WorldZones';

import type { WorldMarker } from '@/types/world';

afterEach(cleanup);

const zone = (id: string, polygon: [number, number][]): WorldMarker => ({
    id,
    mapId: 'm',
    kind: 'zone',
    x: 0,
    y: 0,
    polygon: [...polygon, polygon[0]],
    name: id,
    icon: null,
    color: '#336699',
    dmNote: null,
    description: null,
    alwaysVisible: false,
    sortOrder: 0,
    childMapId: null,
    layerId: null,
});

const a = zone('a', [
    [0.1, 0.1],
    [0.4, 0.1],
    [0.4, 0.4],
    [0.1, 0.4],
]);

const b = zone('b', [
    [0.4, 0.1],
    [0.7, 0.1],
    [0.7, 0.4],
    [0.4, 0.4],
]);

describe('WorldZones', () => {
    it('fills at 0.55 (0.68 selected) through a feather blur with no stroke', () => {
        const { container } = render(
            <WorldZones markers={[a, b]} selectedId="a" />
        );

        const polys = container.querySelectorAll('polygon[data-zone-id]');

        expect(polys[0].getAttribute('fill-opacity')).toBe('0.68');
        expect(polys[1].getAttribute('fill-opacity')).toBe('0.55');
        expect(polys[1].getAttribute('stroke')).toBeNull();
        expect(container.querySelector('g[filter]')).not.toBeNull();
        expect(container.querySelector('filter')?.children).toHaveLength(1);
    });

    it('draws no border lines unless showEdges is set', () => {
        const { container } = render(<WorldZones markers={[a, b]} />);

        expect(container.querySelectorAll('path')).toHaveLength(0);
    });

    it('strokes own edges darker than the zone colour and shared edges with ink', () => {
        const { container } = render(<WorldZones markers={[a, b]} showEdges />);

        expect(
            container
                .querySelector('[data-shared-edge]')
                ?.getAttribute('stroke')
        ).toBe('var(--atlas-ink)');
        expect(
            container
                .querySelector('[data-edge]:not([data-shared-edge])')
                ?.getAttribute('stroke')
        ).toBe('color-mix(in srgb, #336699 60%, black)');
    });

    it('draws solid borders and renders a shared edge once', () => {
        const { container } = render(<WorldZones markers={[a, b]} showEdges />);

        expect(container.querySelector('[stroke-dasharray]')).toBeNull();
        expect(container.querySelectorAll('path[data-edge]')).toHaveLength(7);
        expect(container.querySelectorAll('[data-shared-edge]')).toHaveLength(
            1
        );
    });

    it('paints all underlays before any ink edge', () => {
        const { container } = render(<WorldZones markers={[a, b]} showEdges />);

        const paths = [...container.querySelectorAll('path')];

        const lastUnderlay = Math.max(
            ...paths.flatMap((p, i) =>
                p.hasAttribute('data-edge-underlay') ? [i] : []
            )
        );

        const firstInk = paths.findIndex((p) => p.hasAttribute('data-edge'));

        expect(lastUnderlay).toBeLessThan(firstInk);
    });
});
