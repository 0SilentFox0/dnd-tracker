// @vitest-environment happy-dom
import { NextIntlClientProvider } from 'next-intl';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorldPins } from '../WorldPins';

import type { WorldMarker } from '@/types/world';

afterEach(cleanup);

const zone = (id: string, x: number): WorldMarker => ({
    id,
    mapId: 'm',
    kind: 'zone',
    x,
    y: 0.5,
    polygon: [
        [x - 0.01, 0.49],
        [x + 0.01, 0.49],
        [x + 0.01, 0.51],
        [x - 0.01, 0.49],
    ],
    name: id,
    icon: null,
    color: null,
    dmNote: null,
    description: null,
    alwaysVisible: false,
    sortOrder: 0,
    childMapId: null,
    labelMode: null,
    fillOpacity: null,
    layerId: null,
});

const point: WorldMarker = {
    ...zone('p', 0.9),
    kind: 'point',
    polygon: null,
    icon: 'city',
};

const box = { width: 1000, height: 1000 };

const props = {
    selectedId: null,
    drag: {
        current: null,
        onMove: () => {},
        onEnd: () => {},
        onCancel: () => {},
    },
    handlers: {},
};

describe('WorldPins compact mode', () => {
    it('raises the zoom threshold for pin labels', () => {
        const { container, rerender } = render(
            <WorldPins markers={[point]} zoom={3} {...props} />
        );

        expect(
            container.querySelector('.atlas-pin')?.getAttribute('data-labels')
        ).toBe('true');

        rerender(
            <WorldPins
                markers={[point]}
                zoom={3}
                screen={{ box, compact: true }}
                {...props}
            />
        );

        expect(
            container.querySelector('.atlas-pin')?.getAttribute('data-labels')
        ).toBe('false');
    });

    it('hides overlapping zone labels', () => {
        const markers = [zone('A', 0.3), zone('B', 0.35)];

        const { container, rerender } = render(
            <WorldPins markers={markers} zoom={1} {...props} />
        );

        expect(container.querySelectorAll('.atlas-zone-label')).toHaveLength(2);

        rerender(
            <WorldPins
                markers={markers}
                zoom={1}
                screen={{ box, compact: true }}
                {...props}
            />
        );

        expect(container.querySelectorAll('.atlas-zone-label')).toHaveLength(1);
    });
});

describe('WorldPins zone label mode', () => {
    const count = (el: HTMLElement) =>
        el.querySelectorAll('.atlas-zone-label').length;

    it('hidden hides the label even when hovered', () => {
        const { container } = render(
            <WorldPins
                markers={[{ ...zone('A', 0.3), labelMode: 'hidden' }]}
                zoom={1}
                labels={{ hoveredId: 'A', fogless: true }}
                {...props}
            />
        );

        expect(count(container)).toBe(0);
    });

    it('always shows the label despite a clash with a pin', () => {
        const clashing = { ...point, x: 0.3, y: 0.5 };

        const z = { ...zone('A', 0.3), labelMode: 'always' as const };

        const { container, rerender } = render(
            <WorldPins
                markers={[{ ...z, labelMode: null }, clashing]}
                zoom={1}
                {...props}
            />
        );

        expect(count(container)).toBe(0);

        rerender(<WorldPins markers={[z, clashing]} zoom={1} {...props} />);

        expect(count(container)).toBe(1);
    });
});

describe('WorldPins point colour', () => {
    it('tints the seal of a coloured point and leaves the default otherwise', () => {
        const { container, rerender } = render(
            <WorldPins
                markers={[{ ...point, color: '#ff0000' }]}
                zoom={1}
                {...props}
            />
        );

        expect(
            container.querySelector<HTMLElement>('.atlas-seal')?.style
                .background
        ).toContain('#ff0000');

        rerender(<WorldPins markers={[point]} zoom={1} {...props} />);

        expect(
            container.querySelector<HTMLElement>('.atlas-seal')?.style
                .background
        ).toBe('');
    });

    it('does not tint zone seals', () => {
        const { container } = render(
            <WorldPins
                markers={[{ ...zone('Z', 0.3), color: '#ff0000' }]}
                zoom={1}
                {...props}
            />
        );

        expect(container.querySelector('.atlas-seal')).toBeNull();
    });
});

describe('WorldPins zone label visibility', () => {
    it('hides a label past the hide zoom, but keeps known and fogless ones', () => {
        const plain = zone('A', 0.3);

        const count = (el: HTMLElement) =>
            el.querySelectorAll('.atlas-zone-label').length;

        const { container, rerender } = render(
            <WorldPins markers={[plain]} zoom={6} {...props} />
        );

        expect(count(container)).toBe(0);

        rerender(
            <WorldPins
                markers={[{ ...plain, alwaysVisible: true }]}
                zoom={6}
                {...props}
            />
        );

        expect(count(container)).toBe(1);

        rerender(
            <WorldPins
                markers={[plain]}
                zoom={6}
                labels={{ fogless: true }}
                {...props}
            />
        );

        expect(count(container)).toBe(1);
    });

    it('shows the hovered zone name when it is hidden at the zoom', () => {
        const { container } = render(
            <WorldPins
                markers={[zone('A', 0.3)]}
                zoom={6}
                labels={{ hoveredId: 'A' }}
                {...props}
            />
        );

        expect(container.querySelector('.atlas-zone-label')?.textContent).toBe(
            'A'
        );
    });

    it('hides minor pins at world zoom and shows them zoomed in', () => {
        const village = { ...point, id: 'v', icon: 'village' };

        const { container, rerender } = render(
            <WorldPins markers={[point, village]} zoom={1} {...props} />
        );

        expect(container.querySelectorAll('.atlas-pin')).toHaveLength(1);

        rerender(<WorldPins markers={[point, village]} zoom={2} {...props} />);

        expect(container.querySelectorAll('.atlas-pin')).toHaveLength(2);
        expect(container.querySelector('[data-minor="true"]')).not.toBeNull();
    });

    it('keeps a selected minor pin visible', () => {
        const village = { ...point, id: 'v', icon: 'village' };

        const { container } = render(
            <WorldPins markers={[village]} zoom={1} {...props} selectedId="v" />
        );

        expect(container.querySelectorAll('.atlas-pin')).toHaveLength(1);
    });
});

const messages = {
    world: {
        pinCluster: '{name} and {count} more',
        pinClusterList: 'Places here',
    },
};

const pin = (id: string, x: number, icon: string | null = 'city') => ({
    ...point,
    id,
    name: id,
    x,
    y: 0.5,
    icon,
});

const tree = (
    markers: WorldMarker[],
    extra: Partial<React.ComponentProps<typeof WorldPins>> = {}
) => (
    <NextIntlClientProvider locale="en" messages={messages}>
        <WorldPins
            markers={markers}
            zoom={1}
            screen={{ box }}
            {...props}
            {...extra}
        />
    </NextIntlClientProvider>
);

const renderPins = (
    markers: WorldMarker[],
    extra: Partial<React.ComponentProps<typeof WorldPins>> = {}
) => render(tree(markers, extra));

describe('WorldPins clusters', () => {
    const close = [pin('A', 0.5), pin('B', 0.51)];

    it('groups pins closer than the threshold into one +N cluster', () => {
        const { container } = renderPins(close);

        expect(container.querySelectorAll('.atlas-pin')).toHaveLength(1);
        expect(container.querySelector('[data-cluster="2"]')).not.toBeNull();
        expect(container.textContent).toContain('+1');
    });

    it('the castle represents a cluster with a village and a city', () => {
        renderPins(
            [
                pin('Town', 0.5),
                pin('Hamlet', 0.505, 'village'),
                pin('Keep', 0.51, 'castle'),
            ],
            { zoom: 2 }
        );

        expect(
            screen.getByLabelText('world.pinCluster {"name":"Keep","count":2}')
        ).not.toBeNull();
    });

    it('keeps the selected pin out of a cluster', () => {
        const { container } = renderPins(close, { selectedId: 'B' });

        expect(container.querySelectorAll('.atlas-pin')).toHaveLength(2);
        expect(container.querySelector('[data-cluster]')).toBeNull();
    });

    it('does not cluster without screen or with cluster: false', () => {
        const { container, rerender } = renderPins(close, {
            screen: undefined,
        });

        expect(container.querySelectorAll('.atlas-pin')).toHaveLength(2);

        rerender(tree(close, { screen: { box, cluster: false } }));

        expect(container.querySelectorAll('.atlas-pin')).toHaveLength(2);
    });

    it('uses the wider compact threshold', () => {
        const gap = [pin('A', 0.5), pin('B', 0.5315)];

        const { container, rerender } = renderPins(gap);

        expect(container.querySelectorAll('.atlas-pin')).toHaveLength(2);

        rerender(tree(gap, { screen: { box, compact: true } }));

        expect(container.querySelectorAll('.atlas-pin')).toHaveLength(1);
    });

    it('clicking a cluster below max zoom calls onClusterZoom with its centre and a larger zoom', () => {
        const onClusterZoom = vi.fn();

        const { container } = renderPins(close, {
            handlers: { onClusterZoom },
        });

        fireEvent.click(container.querySelector('[data-cluster]')!);

        const [center, zoom] = onClusterZoom.mock.calls[0];

        expect(center.x).toBeCloseTo(0.505);
        expect(zoom).toBeGreaterThan(1);
    });

    it('at max zoom a cluster opens a list and a row calls onMarkerClick', () => {
        const onMarkerClick = vi.fn();

        const { container } = renderPins(close, {
            zoom: 8,
            screen: { box: { width: 10, height: 10 } },
            handlers: { onMarkerClick },
        });

        fireEvent.click(container.querySelector('[data-cluster]')!);
        fireEvent.click(screen.getByText('B'));

        expect(onMarkerClick).toHaveBeenCalledWith('B');
    });

    it('pins in one point open the list instead of zooming', () => {
        const onClusterZoom = vi.fn();

        const { container } = renderPins([pin('A', 0.5), pin('B', 0.5)], {
            handlers: { onClusterZoom },
        });

        fireEvent.click(container.querySelector('[data-cluster]')!);

        expect(onClusterZoom).not.toHaveBeenCalled();
        expect(screen.getByLabelText('world.pinClusterList')).not.toBeNull();
    });

    it('the tour marker attribute lands on a single pin, not a clustered one', () => {
        const { container } = renderPins([
            pin('A', 0.5),
            pin('B', 0.51),
            pin('C', 0.9),
        ]);

        const tagged = container.querySelectorAll('[data-tour="world.marker"]');

        expect(tagged).toHaveLength(1);
        expect(tagged[0].getAttribute('aria-label')).toBe('C');
    });

    it('zooming in splits a cluster into single pins', () => {
        const { container } = renderPins(close, { zoom: 4 });

        expect(container.querySelector('[data-cluster]')).toBeNull();
        expect(container.querySelectorAll('.atlas-pin')).toHaveLength(2);
    });
});
