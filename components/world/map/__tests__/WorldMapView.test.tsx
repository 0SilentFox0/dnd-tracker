// @vitest-environment happy-dom
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WorldMapView } from '../WorldMapView';

import { render } from '@/components/ui/__tests__/uk-intl';
import type { WorldMapDetail, WorldMarker } from '@/types/world';

vi.unmock('next-intl');

vi.mock('next/image', () => ({
    default: (p: {
        alt: string;
        src: string;
        sizes?: string;
        srcSet?: string;
        className?: string;
    }) => (
        <img
            alt={p.alt}
            src={p.src}
            sizes={p.sizes}
            srcSet={p.srcSet}
            className={p.className}
            aria-hidden={p.alt === '' ? true : undefined}
        />
    ),
}));

const marker = (o: Partial<WorldMarker>): WorldMarker => ({
    id: 'm',
    mapId: 'map',
    kind: 'point',
    x: 0.5,
    y: 0.5,
    polygon: null,
    name: 'Marker',
    icon: null,
    color: null,
    dmNote: null,
    description: null,
    alwaysVisible: false,
    sortOrder: 0,
    childMapId: null,
    layerId: null,
    ...o,
});

const detail = (markers: WorldMarker[]): WorldMapDetail => ({
    map: {
        id: 'map',
        name: 'World',
        parentMarkerId: null,
        parentMapId: null,
        imageUrl: 'https://x/w.webp',
        width: 800,
        height: 600,
        fogEnabled: true,
        revealRadius: 0.05,
        entryX: 0.5,
        entryY: 0.5,
        updatedAt: '',
    },
    markers,
});

const ring = (pts: [number, number][]) => [...pts, pts[0]];

beforeEach(() => {
    vi.stubGlobal(
        'ResizeObserver',
        class {
            observe() {}
            disconnect() {}
            unobserve() {}
        }
    );
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        right: 800,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => ({}),
    });
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

const box = () => screen.getByTestId('world-map-box');

describe('WorldMapView', () => {
    it('renders a polygon per zone and a button per marker', () => {
        const zone = marker({
            id: 'z',
            kind: 'zone',
            name: 'Forest',
            polygon: ring([
                [0.1, 0.1],
                [0.4, 0.1],
                [0.2, 0.4],
            ]),
        });

        const { container } = render(
            <WorldMapView
                detail={detail([marker({ id: 'p', name: 'Town' }), zone])}
            />
        );

        expect(container.querySelectorAll('polygon')).toHaveLength(1);
        expect(screen.getByRole('button', { name: 'Town' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Forest' })).toBeTruthy();
    });

    it('shows the hint beside the mouse pointer and hides it for touch', () => {
        const { container } = render(
            <WorldMapView
                detail={detail([])}
                slots={{ hint: <p>hint text</p> }}
            />
        );

        const root = container.querySelector('.atlas-map') as HTMLElement;

        expect(screen.queryByText('hint text')).toBeNull();

        fireEvent.pointerMove(root, {
            pointerType: 'mouse',
            clientX: 100,
            clientY: 80,
        });

        const wrap = screen.getByTestId('world-map-hint');

        expect(screen.getByText('hint text')).toBeTruthy();
        expect(wrap.style.left).toMatch(/px$/);
        expect(wrap.style.top).toMatch(/px$/);

        fireEvent.pointerMove(root, {
            pointerType: 'touch',
            clientX: 100,
            clientY: 80,
        });

        expect(screen.queryByText('hint text')).toBeNull();
    });

    it('clicking the background reports a normalised point', () => {
        const onMapClick = vi.fn();

        render(<WorldMapView detail={detail([])} handlers={{ onMapClick }} />);
        fireEvent.pointerDown(box(), {
            pointerId: 1,
            clientX: 200,
            clientY: 150,
        });
        fireEvent.pointerUp(box(), {
            pointerId: 1,
            clientX: 200,
            clientY: 150,
        });

        expect(onMapClick).toHaveBeenCalledWith({ x: 0.25, y: 0.25 });
    });

    it('a map drag does not place a point', () => {
        const onMapClick = vi.fn();

        render(<WorldMapView detail={detail([])} handlers={{ onMapClick }} />);
        fireEvent.pointerDown(box(), {
            pointerId: 1,
            clientX: 200,
            clientY: 150,
        });
        fireEvent.pointerMove(box(), {
            pointerId: 1,
            clientX: 220,
            clientY: 150,
        });
        fireEvent.pointerUp(box(), {
            pointerId: 1,
            clientX: 220,
            clientY: 150,
        });

        expect(onMapClick).not.toHaveBeenCalled();
    });

    it('clicking a pin selects it without a map click', () => {
        const onMapClick = vi.fn();

        const onMarkerClick = vi.fn();

        render(
            <WorldMapView
                detail={detail([marker({ id: 'p', name: 'Town' })])}
                handlers={{ onMapClick, onMarkerClick }}
            />
        );

        const pin = screen.getByRole('button', { name: 'Town' });

        fireEvent.pointerDown(pin, {
            pointerId: 1,
            clientX: 400,
            clientY: 300,
        });
        fireEvent.pointerUp(pin, { pointerId: 1, clientX: 400, clientY: 300 });

        expect(onMarkerClick).toHaveBeenCalledWith('p');
        expect(onMapClick).not.toHaveBeenCalled();
    });

    it('dragging a point pin reports its new position', () => {
        const onMarkerDrag = vi.fn();

        const onMarkerClick = vi.fn();

        render(
            <WorldMapView
                detail={detail([marker({ id: 'p', name: 'Town' })])}
                handlers={{ onMarkerDrag, onMarkerClick }}
            />
        );

        const pin = screen.getByRole('button', { name: 'Town' });

        fireEvent.pointerDown(pin, {
            pointerId: 1,
            clientX: 400,
            clientY: 300,
        });
        fireEvent.pointerMove(pin, {
            pointerId: 1,
            clientX: 480,
            clientY: 300,
        });
        fireEvent.pointerUp(pin, { pointerId: 1, clientX: 480, clientY: 300 });

        expect(onMarkerDrag).toHaveBeenCalledWith('p', { x: 0.6, y: 0.5 });
        expect(onMarkerClick).not.toHaveBeenCalled();
    });

    it('dragging a pin in point mode moves it without creating a marker', () => {
        const onMarkerDrag = vi.fn();

        const onMapClick = vi.fn();

        render(
            <WorldMapView
                detail={detail([marker({ id: 'p', name: 'Town' })])}
                handlers={{ onMarkerDrag, onMapClick }}
                edit={{ tool: 'point' }}
            />
        );

        const pin = screen.getByRole('button', { name: 'Town' });

        fireEvent.pointerDown(pin, {
            pointerId: 1,
            clientX: 400,
            clientY: 300,
        });
        fireEvent.pointerMove(pin, {
            pointerId: 1,
            clientX: 480,
            clientY: 300,
        });
        fireEvent.pointerUp(box(), {
            pointerId: 1,
            clientX: 480,
            clientY: 300,
        });

        expect(onMapClick).not.toHaveBeenCalled();

        fireEvent.pointerDown(pin, {
            pointerId: 1,
            clientX: 400,
            clientY: 300,
        });
        fireEvent.pointerMove(pin, {
            pointerId: 1,
            clientX: 480,
            clientY: 300,
        });
        fireEvent.pointerUp(pin, { pointerId: 1, clientX: 480, clientY: 300 });

        expect(onMarkerDrag).toHaveBeenCalledTimes(1);
        expect(onMapClick).not.toHaveBeenCalled();
    });

    it('a plain click on a pin in point mode does not create a point', () => {
        const onMapClick = vi.fn();

        render(
            <WorldMapView
                detail={detail([marker({ id: 'p', name: 'Town' })])}
                handlers={{ onMapClick }}
                edit={{ tool: 'point' }}
            />
        );

        const pin = screen.getByRole('button', { name: 'Town' });

        fireEvent.pointerDown(pin, {
            pointerId: 1,
            clientX: 400,
            clientY: 300,
        });
        fireEvent.pointerUp(pin, { pointerId: 1, clientX: 400, clientY: 300 });

        expect(onMapClick).not.toHaveBeenCalled();
    });

    it('without onMarkerDrag a pin is not draggable and its click is ignored', () => {
        const onMarkerClick = vi.fn();

        render(
            <WorldMapView
                detail={detail([marker({ id: 'p', name: 'Town' })])}
                handlers={{ onMarkerClick: undefined }}
                edit={{ tool: 'zone' }}
            />
        );

        const pin = screen.getByRole('button', { name: 'Town' });

        fireEvent.pointerDown(pin, {
            pointerId: 1,
            clientX: 400,
            clientY: 300,
        });
        fireEvent.pointerMove(pin, {
            pointerId: 1,
            clientX: 480,
            clientY: 300,
        });
        fireEvent.pointerUp(pin, { pointerId: 1, clientX: 480, clientY: 300 });

        expect(onMarkerClick).not.toHaveBeenCalled();
        expect(pin.dataset.dragging).toBe('false');
    });

    it('clicking a zone area in select mode selects it, not in point mode', () => {
        const onMarkerClick = vi.fn();

        const zone = marker({
            id: 'z',
            kind: 'zone',
            name: 'Forest',
            polygon: ring([
                [0.1, 0.1],
                [0.4, 0.1],
                [0.2, 0.4],
            ]),
        });

        const { container, rerender } = render(
            <WorldMapView
                detail={detail([zone])}
                handlers={{ onMarkerClick }}
                edit={{ tool: 'select' }}
            />
        );

        const poly = container.querySelector('polygon') as Element;

        fireEvent.pointerDown(poly, {
            pointerId: 1,
            clientX: 200,
            clientY: 150,
        });
        fireEvent.pointerUp(poly, { pointerId: 1, clientX: 200, clientY: 150 });

        expect(onMarkerClick).toHaveBeenCalledWith('z');
        expect(poly.getAttribute('data-interactive')).toBe('true');

        rerender(
            <WorldMapView
                detail={detail([zone])}
                handlers={{ onMarkerClick }}
                edit={{ tool: 'point' }}
            />
        );

        expect(
            (container.querySelector('polygon') as Element).getAttribute(
                'data-interactive'
            )
        ).toBe('false');
    });

    it('double-clicking a zone area opens it as a marker; elsewhere it is a map double-click', () => {
        const onMarkerDoubleClick = vi.fn();

        const onMapDoubleClick = vi.fn();

        const zone = marker({
            id: 'z',
            kind: 'zone',
            name: 'Forest',
            polygon: ring([
                [0.1, 0.1],
                [0.4, 0.1],
                [0.2, 0.4],
            ]),
        });

        const { container } = render(
            <WorldMapView
                detail={detail([zone])}
                handlers={{ onMarkerDoubleClick, onMapDoubleClick }}
                edit={{ tool: 'select' }}
            />
        );

        fireEvent.doubleClick(container.querySelector('polygon') as Element);

        expect(onMarkerDoubleClick).toHaveBeenCalledWith('z');
        expect(onMapDoubleClick).not.toHaveBeenCalled();

        fireEvent.doubleClick(box(), { clientX: 700, clientY: 500 });

        expect(onMapDoubleClick).toHaveBeenCalledTimes(1);
    });

    it('clicking a zone area in move mode resolves the zone as a target', () => {
        const onMarkerClick = vi.fn();

        const zone = marker({
            id: 'z',
            kind: 'zone',
            name: 'Forest',
            polygon: ring([
                [0.1, 0.1],
                [0.4, 0.1],
                [0.2, 0.4],
            ]),
        });

        const { container } = render(
            <WorldMapView
                detail={detail([zone])}
                handlers={{ onMarkerClick }}
                edit={{ tool: 'move' }}
            />
        );

        const poly = container.querySelector('polygon') as Element;

        fireEvent.pointerDown(poly, {
            pointerId: 1,
            clientX: 200,
            clientY: 150,
        });
        fireEvent.pointerUp(poly, { pointerId: 1, clientX: 200, clientY: 150 });

        expect(onMarkerClick).toHaveBeenCalledWith('z');
        expect(poly.getAttribute('data-interactive')).toBe('true');
    });

    it('shows the pin label state for selected pins and hides zone labels at high zoom', () => {
        const zone = marker({
            id: 'z',
            kind: 'zone',
            name: 'Forest',
            x: 0.8,
            y: 0.8,
            polygon: ring([
                [0.7, 0.7],
                [0.9, 0.7],
                [0.8, 0.9],
            ]),
        });

        render(
            <WorldMapView
                detail={detail([
                    marker({ id: 'p', name: 'Town', x: 0.1, y: 0.1 }),
                    zone,
                ])}
                selectedId="p"
                fog={{ shapes: [], radius: 0.05 }}
            />
        );

        expect(
            screen.getByRole('button', { name: 'Town' }).dataset.selected
        ).toBe('true');
        expect(screen.getByRole('button', { name: 'Forest' })).toBeTruthy();

        for (let i = 0; i < 4; i++)
            fireEvent.click(screen.getByRole('button', { name: 'Наблизити' }));

        expect(screen.queryByRole('button', { name: 'Forest' })).toBeNull();
    });

    it('hides a zone label that clashes with a pin', () => {
        const zone = marker({
            id: 'z',
            kind: 'zone',
            name: 'Forest',
            polygon: ring([
                [0.4, 0.4],
                [0.6, 0.4],
                [0.5, 0.6],
            ]),
        });

        render(
            <WorldMapView
                detail={detail([
                    marker({ id: 'p', name: 'Town', x: 0.5, y: 0.47 }),
                    zone,
                ])}
            />
        );

        expect(screen.queryByRole('button', { name: 'Forest' })).toBeNull();
    });

    it('highlights the first draft vertex once the zone can be closed', () => {
        const { container } = render(
            <WorldMapView
                detail={detail([])}
                edit={{
                    tool: 'zone',
                    draft: [
                        { x: 0.1, y: 0.1 },
                        { x: 0.3, y: 0.2 },
                        { x: 0.2, y: 0.4 },
                    ],
                }}
            />
        );

        expect(
            container.querySelectorAll('.atlas-draft-dot[data-closable="true"]')
        ).toHaveLength(1);
    });

    it('draws an open draft as a polyline', () => {
        const { container } = render(
            <WorldMapView
                detail={detail([])}
                edit={{
                    draft: [
                        { x: 0.1, y: 0.1 },
                        { x: 0.3, y: 0.2 },
                    ],
                }}
            />
        );

        expect(container.querySelector('polyline')).toBeTruthy();
    });

    it('wheel zoom works although the box mounts only after the size is known', () => {
        render(<WorldMapView detail={detail([])} />);

        const scaled = () =>
            (box().firstElementChild as HTMLElement).style.transform;

        expect(scaled()).toContain('scale(1)');

        act(
            () =>
                void box().dispatchEvent(
                    new WheelEvent('wheel', {
                        deltaY: -100,
                        clientX: 400,
                        clientY: 300,
                        cancelable: true,
                        bubbles: true,
                    })
                )
        );

        expect(scaled()).not.toContain('scale(1)');
    });

    it('a pan that ends over a pin still ends the gesture', () => {
        render(
            <WorldMapView
                detail={detail([marker({ id: 'p', name: 'Town' })])}
            />
        );
        fireEvent.click(screen.getByRole('button', { name: 'Наблизити' }));

        const offset = () =>
            (box().firstElementChild as HTMLElement).style.transform;

        const pin = screen.getByRole('button', { name: 'Town' });

        fireEvent.pointerDown(box(), {
            pointerId: 1,
            clientX: 200,
            clientY: 150,
        });
        fireEvent.pointerMove(box(), {
            pointerId: 1,
            clientX: 240,
            clientY: 150,
        });
        fireEvent.pointerUp(pin, { pointerId: 1, clientX: 240, clientY: 150 });

        const after = offset();

        fireEvent.pointerMove(box(), {
            pointerId: 1,
            clientX: 300,
            clientY: 150,
        });

        expect(offset()).toBe(after);
    });

    it('draws the fog above the map but under pins and heroes', () => {
        const hero = {
            id: 'h',
            name: 'Aria',
            avatar: null,
            mapId: 'map',
            x: 0.3,
            y: 0.3,
            own: true,
        };

        render(
            <WorldMapView
                detail={detail([marker({ id: 'p', name: 'Town' })])}
                fog={{ shapes: [], radius: 0.05 }}
                heroes={[hero]}
            />
        );

        const fog = screen.getByTestId('world-fog');

        const after = (el: Element) =>
            Boolean(
                fog.compareDocumentPosition(el) &
                    Node.DOCUMENT_POSITION_FOLLOWING
            );

        expect(after(screen.getByRole('button', { name: 'Town' }))).toBe(true);
        expect(after(screen.getByRole('button', { name: 'Aria' }))).toBe(true);
        expect(
            fog.compareDocumentPosition(screen.getByAltText('World')) &
                Node.DOCUMENT_POSITION_PRECEDING
        ).toBeTruthy();
    });

    it('centres on a focus point', () => {
        render(
            <WorldMapView
                detail={detail([])}
                focus={{ point: { x: 0.5, y: 0.5 }, seq: 1 }}
            />
        );

        expect((box().firstElementChild as HTMLElement).style.transform).toBe(
            'translate(-800px, -600px) scale(3)'
        );
    });
});

describe('WorldMapView zone snapping', () => {
    const neighbour = marker({
        id: 'z',
        kind: 'zone',
        name: 'Forest',
        polygon: ring([
            [0.1, 0.1],
            [0.4, 0.1],
            [0.2, 0.4],
        ]),
    });

    const click = (x: number, y: number, altKey = false) => {
        fireEvent.pointerDown(box(), { pointerId: 1, clientX: x, clientY: y });
        fireEvent.pointerUp(box(), {
            pointerId: 1,
            clientX: x,
            clientY: y,
            altKey,
        });
    };

    const snap = (enabled: boolean) => ({
        zones: [neighbour.polygon as [number, number][]],
        enabled,
    });

    it('a zone click near a vertex lands exactly on it', () => {
        const onMapClick = vi.fn();

        render(
            <WorldMapView
                detail={detail([neighbour])}
                handlers={{ onMapClick }}
                edit={{ tool: 'zone', snap: snap(true) }}
            />
        );
        click(84, 63);

        expect(onMapClick).toHaveBeenCalledWith({ x: 0.1, y: 0.1 });
    });

    it('Alt or disabled snapping passes the raw point', () => {
        const onMapClick = vi.fn();

        const { rerender } = render(
            <WorldMapView
                detail={detail([neighbour])}
                handlers={{ onMapClick }}
                edit={{ tool: 'zone', snap: snap(true) }}
            />
        );

        click(88, 66, true);
        expect(onMapClick).toHaveBeenLastCalledWith({ x: 0.11, y: 0.11 });

        rerender(
            <WorldMapView
                detail={detail([neighbour])}
                handlers={{ onMapClick }}
                edit={{ tool: 'zone', snap: snap(false) }}
            />
        );
        click(88, 66);
        expect(onMapClick).toHaveBeenLastCalledWith({ x: 0.11, y: 0.11 });
    });

    it('a click outside the snap radius is not moved', () => {
        const onMapClick = vi.fn();

        render(
            <WorldMapView
                detail={detail([neighbour])}
                handlers={{ onMapClick }}
                edit={{ tool: 'zone', snap: snap(true) }}
            />
        );
        click(160, 120);

        expect(onMapClick).toHaveBeenCalledWith({ x: 0.2, y: 0.2 });
    });

    it('snap radius in normalized units shrinks as zoom grows', () => {
        const onMapClick = vi.fn();

        const at = { x: 0.106, y: 0.106 };

        const { rerender } = render(
            <WorldMapView
                detail={detail([neighbour])}
                handlers={{ onMapClick }}
                edit={{ tool: 'zone', snap: snap(true) }}
            />
        );

        click(at.x * 800, at.y * 600);
        expect(onMapClick).toHaveBeenLastCalledWith({ x: 0.1, y: 0.1 });

        rerender(
            <WorldMapView
                detail={detail([neighbour])}
                handlers={{ onMapClick }}
                edit={{ tool: 'zone', snap: snap(true) }}
                focus={{ point: { x: 0.5, y: 0.5 }, seq: 1 }}
            />
        );
        click(at.x * 2400 - 800, at.y * 1800 - 600);

        const last = onMapClick.mock.calls.at(-1)?.[0];

        expect(last.x).toBeCloseTo(0.106, 3);
        expect(last.y).toBeCloseTo(0.106, 3);
    });

    it('shows vertex handles only for the selected zone in select mode with onVertexChange', () => {
        const { container, rerender } = render(
            <WorldMapView
                detail={detail([neighbour])}
                selectedId="z"
                handlers={{ onVertexChange: vi.fn() }}
            />
        );

        expect(container.querySelectorAll('[data-vertex]')).toHaveLength(3);

        rerender(
            <WorldMapView
                detail={detail([neighbour])}
                selectedId="z"
                handlers={{ onVertexChange: vi.fn() }}
                edit={{ tool: 'zone' }}
            />
        );
        expect(container.querySelectorAll('[data-vertex]')).toHaveLength(0);
    });

    it('double-click on a vertex removes it, keeping at least three', () => {
        const onVertexChange = vi.fn();

        const square = marker({
            id: 'q',
            kind: 'zone',
            name: 'Sq',
            polygon: ring([
                [0.1, 0.1],
                [0.4, 0.1],
                [0.4, 0.4],
                [0.1, 0.4],
            ]),
        });

        const { container } = render(
            <WorldMapView
                detail={detail([square])}
                selectedId="q"
                handlers={{ onVertexChange }}
            />
        );

        fireEvent.doubleClick(
            container.querySelector('[data-vertex="0"]') as Element
        );

        expect(onVertexChange).toHaveBeenCalledWith('q', [
            [0.4, 0.1],
            [0.4, 0.4],
            [0.1, 0.4],
            [0.4, 0.1],
        ]);
    });
});

describe('WorldMapView card slot', () => {
    it('renders the card outside the transformed layers and swallows pointer events', () => {
        const onMapClick = vi.fn();

        render(
            <WorldMapView
                detail={detail([])}
                handlers={{ onMapClick }}
                slots={{
                    card: { point: { x: 0.5, y: 0.5 }, content: <p>bubble</p> },
                }}
            />
        );

        const card = screen.getByTestId('world-map-card');

        expect(card.parentElement).toBe(box());
        expect(['above', 'below']).toContain(card.dataset.placement);

        fireEvent.pointerDown(card, {
            pointerId: 1,
            clientX: 400,
            clientY: 300,
        });
        fireEvent.pointerUp(card, { pointerId: 1, clientX: 400, clientY: 300 });

        expect(onMapClick).not.toHaveBeenCalled();
    });

    it('hides markers of hidden layers', () => {
        render(
            <WorldMapView
                detail={detail([
                    marker({ id: 'p', name: 'Town', layerId: 'l1' }),
                    marker({ id: 'q', name: 'Port' }),
                ])}
                layers={{ items: [], hidden: new Set(['l1']) }}
            />
        );

        expect(screen.queryByRole('button', { name: 'Town' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Port' })).toBeTruthy();
    });

    it('renders the blurred backdrop with the same image URL and sizes as the map', () => {
        const { container } = render(<WorldMapView detail={detail([])} />);

        const backdrop = container.querySelector('.atlas-backdrop');

        const main = screen.getByAltText('World');

        expect(backdrop).not.toBeNull();
        expect(backdrop?.getAttribute('aria-hidden')).toBe('true');
        expect(backdrop?.getAttribute('src')).toBe(main.getAttribute('src'));
        expect(backdrop?.getAttribute('srcset')).toBe(
            main.getAttribute('srcset')
        );
        expect(backdrop?.getAttribute('sizes')).toBe(main.getAttribute('sizes'));
    });

    it('shows the fullscreen button only when slots.fullscreen is given and calls toggle', () => {
        const toggle = vi.fn();

        const { rerender } = render(<WorldMapView detail={detail([])} />);

        expect(screen.queryByRole('button', { name: 'Повний екран' })).toBeNull();

        rerender(
            <WorldMapView
                detail={detail([])}
                slots={{ fullscreen: { full: false, toggle } }}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'Повний екран' }));

        expect(toggle).toHaveBeenCalledTimes(1);
    });

    it('the fullscreen button label follows the state', () => {
        render(
            <WorldMapView
                detail={detail([])}
                slots={{ fullscreen: { full: true, toggle: vi.fn() } }}
            />
        );

        const btn = screen.getByRole('button', {
            name: 'Вийти з повного екрана',
        });

        expect(btn.getAttribute('aria-pressed')).toBe('true');
    });

    it('clusters close pins and a cluster click zooms the view', () => {
        const { container } = render(
            <WorldMapView
                detail={detail([
                    marker({ id: 'a', name: 'Alpha', x: 0.5, y: 0.5 }),
                    marker({ id: 'b', name: 'Beta', x: 0.501, y: 0.5 }),
                ])}
            />
        );

        const layer = container.querySelector('.atlas-top-layer') as HTMLElement;

        const before = layer.style.transform;

        fireEvent.click(screen.getByRole('button', { name: /ще 1/ }));

        expect(layer.style.transform).not.toBe(before);
    });

    it('does not cluster pins with the point tool', () => {
        render(
            <WorldMapView
                detail={detail([
                    marker({ id: 'a', name: 'Alpha', x: 0.5, y: 0.5 }),
                    marker({ id: 'b', name: 'Beta', x: 0.501, y: 0.5 }),
                ])}
                edit={{ tool: 'point' }}
            />
        );

        expect(screen.getByRole('button', { name: 'Alpha' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Beta' })).toBeTruthy();
    });

    it('a focus with zoom 1 pans without zooming', () => {
        const { container, rerender } = render(
            <WorldMapView detail={detail([])} />
        );

        fireEvent.click(screen.getByRole('button', { name: 'Наблизити' }));

        const layer = container.querySelector('.atlas-top-layer') as HTMLElement;

        const parse = (t: string) => {
            const m = /translate\((-?[\d.]+)px, (-?[\d.]+)px\) scale\(([\d.]+)\)/.exec(
                t
            );

            return { x: Number(m?.[1]), y: Number(m?.[2]), scale: Number(m?.[3]) };
        };

        const before = parse(layer.style.transform);

        expect(before.scale).toBeGreaterThan(1);

        rerender(
            <WorldMapView
                detail={detail([])}
                focus={{ point: { x: 0.9, y: 0.9 }, seq: 1, zoom: 1 }}
            />
        );

        const after = parse(layer.style.transform);

        expect(after.scale).toBe(before.scale);
        expect([after.x, after.y]).not.toEqual([before.x, before.y]);
    });

    it('rescales the offset when the box width changes', () => {
        const observers: ((e: unknown[]) => void)[] = [];

        vi.stubGlobal(
            'ResizeObserver',
            class {
                constructor(cb: (e: unknown[]) => void) {
                    observers.push(cb);
                }
                observe() {}
                disconnect() {}
                unobserve() {}
            }
        );

        const { container } = render(
            <WorldMapView
                detail={detail([])}
                focus={{ point: { x: 0.5, y: 0.5 }, seq: 1 }}
            />
        );

        const layer = container.querySelector('.atlas-top-layer') as HTMLElement;

        expect(layer.style.transform).toBe('translate(-800px, -600px) scale(3)');

        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
            left: 0,
            top: 0,
            width: 400,
            height: 300,
            right: 400,
            bottom: 300,
            x: 0,
            y: 0,
            toJSON: () => ({}),
        });

        act(() => observers.forEach((cb) => cb([{}])));

        expect(layer.style.transform).toBe('translate(-400px, -300px) scale(3)');
    });
});
