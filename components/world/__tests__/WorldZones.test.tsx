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
    it('fills at 0.28 (0.38 selected) with no stroke on the polygon', () => {
        const { container } = render(
            <WorldZones markers={[a, b]} selectedId="a" />
        );

        const polys = container.querySelectorAll('polygon[data-zone-id]');

        expect(polys[0].getAttribute('fill-opacity')).toBe('0.38');
        expect(polys[1].getAttribute('fill-opacity')).toBe('0.28');
        expect(polys[1].getAttribute('stroke')).toBeNull();
    });

    it('draws solid borders and renders a shared edge once', () => {
        const { container } = render(<WorldZones markers={[a, b]} />);

        expect(container.querySelector('[stroke-dasharray]')).toBeNull();
        expect(container.querySelectorAll('path[data-edge]')).toHaveLength(7);
        expect(container.querySelectorAll('[data-shared-edge]')).toHaveLength(
            1
        );
    });
});
