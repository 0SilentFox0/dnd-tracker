// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WorldPlayClient } from '../WorldPlayClient';

import { renderWithConfirm } from '@/components/ui/__tests__/uk-intl';
import * as api from '@/lib/api/world';
import type { WorldMarker, WorldView } from '@/types/world';

vi.unmock('next-intl');

vi.mock('@/lib/api/world');

const pusherSync = vi.fn();

vi.mock('@/lib/hooks/show', async (orig) => ({
    ...(await orig<typeof import('@/lib/hooks/show')>()),
    usePusherShowSync: (...a: unknown[]) => pusherSync(...a),
}));

const push = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push }),
    usePathname: () => '/campaigns/c1/world',
}));

vi.mock('next/image', () => ({
    default: (p: { alt: string }) => <img alt={p.alt} />,
}));

const marker = {
    id: 'k1',
    mapId: 'm1',
    kind: 'point',
    x: 0.4,
    y: 0.4,
    polygon: null,
    name: 'Town',
    icon: null,
    color: null,
    dmNote: null,
    description: 'Old market town',
    alwaysVisible: true,
    sortOrder: 0,
    childMapId: 'm2',
    layerId: null,
} as WorldMarker;

const view = (): WorldView => ({
    map: {
        id: 'm1',
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
    markers: [marker],
    heroes: [
        {
            id: 'h1',
            name: 'Aria',
            avatar: null,
            mapId: 'm1',
            x: 0.3,
            y: 0.3,
            own: true,
        },
    ],
    reveals: [],
    maps: [
        {
            id: 'm1',
            name: 'World',
            parentMarkerId: null,
            parentMapId: null,
            imageUrl: '',
            width: 1,
            height: 1,
        },
        {
            id: 'm2',
            name: 'Cellar',
            parentMarkerId: 'k1',
            parentMapId: 'm1',
            imageUrl: '',
            width: 1,
            height: 1,
        },
    ],
    notes: [],
    layers: [],
    fog: true,
});

const click = (el: HTMLElement) => {
    fireEvent.pointerDown(el, { pointerId: 1, clientX: 320, clientY: 240 });
    fireEvent.pointerUp(el, { pointerId: 1, clientX: 320, clientY: 240 });
};

const renderClient = (mapId: string | null) =>
    renderWithConfirm(
        <QueryClientProvider
            client={
                new QueryClient({
                    defaultOptions: { queries: { retry: false } },
                })
            }
        >
            <WorldPlayClient
                campaignId="c1"
                campaignName="Camp"
                mapId={mapId}
            />
        </QueryClientProvider>
    );

beforeEach(() => {
    vi.stubGlobal(
        'ResizeObserver',
        class {
            observe() {}
            disconnect() {}
            unobserve() {}
        }
    );
    vi.stubGlobal('matchMedia', (q: string) => ({
        matches: true,
        media: q,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    }));
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
    vi.mocked(api.getWorldView).mockResolvedValue(view());
    vi.mocked(api.getTravelLog).mockResolvedValue([]);
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('WorldPlayClient', () => {
    it('shows an empty state when the DM has not prepared a map', () => {
        renderClient(null);

        expect(screen.getByText('ДМ ще не підготував карту')).toBeTruthy();
        expect(api.getWorldView).not.toHaveBeenCalled();
    });

    it('renders the map with my heroes and open places, and opens a place', async () => {
        renderClient('m1');

        expect(
            await screen.findByRole('button', { name: 'Town' })
        ).toBeTruthy();
        expect(document.querySelector('[data-tour="world.map"]')).toBeTruthy();
        expect(
            document.querySelector('[data-tour="world.crumbs"]')
        ).toBeTruthy();
        expect(
            screen.getByRole('button', { name: 'Aria', pressed: false })
        ).toBeTruthy();

        fireEvent.click(screen.getByRole('treeitem', { name: 'Cellar' }));

        expect(push).toHaveBeenCalledWith('/campaigns/c1/world?map=m2');
    });

    it('shows no layer legend when the view has no layers', async () => {
        renderClient('m1');

        await screen.findByRole('button', { name: 'Town' });

        expect(screen.queryByLabelText('Шари')).toBeNull();
    });

    it('hides markers of a layer toggled off in the legend', async () => {
        vi.mocked(api.getWorldView).mockResolvedValue({
            ...view(),
            markers: [{ ...marker, layerId: 'l1' }],
            layers: [
                {
                    id: 'l1',
                    name: 'Sea',
                    color: null,
                    imageUrl: null,
                    imageRect: null,
                    opacity: 1,
                } as unknown as WorldView['layers'][number],
            ],
        });

        renderClient('m1');

        expect(
            await screen.findByRole('button', { name: 'Town' })
        ).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /Sea/ }));

        await waitFor(() =>
            expect(screen.queryByRole('button', { name: 'Town' })).toBeNull()
        );
    });

    it('subscribes to the show channel so the page updates live', () => {
        renderClient('m1');

        expect(pusherSync).toHaveBeenCalledWith('c1', true);
    });

    it('the tree contains exactly the maps of the view', async () => {
        vi.mocked(api.getWorldView).mockResolvedValue({
            ...view(),
            maps: view().maps.filter((m) => m.id === 'm1'),
        });
        renderClient('m1');

        await screen.findByRole('button', { name: 'Town' });

        expect(screen.getByRole('treeitem', { name: 'World' })).toBeTruthy();
        expect(screen.queryByRole('treeitem', { name: 'Cellar' })).toBeNull();
    });

    it('a selected marker shows its bubble with the description and open-map', async () => {
        renderClient('m1');

        click(await screen.findByRole('button', { name: 'Town' }));

        const bubble = await screen.findByRole('dialog', { name: 'Town' });

        expect(bubble.textContent).toContain('Town');
        expect(
            within(bubble).getByRole('button', { name: 'Відкрити карту' })
        ).toBeTruthy();
    });

    it('on a phone the bubble is a bottom sheet with the name once', async () => {
        vi.stubGlobal('matchMedia', (q: string) => ({
            matches: false,
            media: q,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }));
        renderClient('m1');

        click(await screen.findByRole('button', { name: 'Town' }));

        const sheets = await screen.findAllByRole('dialog', { name: 'Town' });

        expect(sheets.length).toBeGreaterThan(0);
        expect(screen.getByText('Old market town')).toBeTruthy();
        expect(screen.getAllByRole('heading', { name: 'Town' })).toHaveLength(1);

        fireEvent.click(await screen.findByText('Докладніше'));

        await waitFor(() =>
            expect(screen.getByLabelText('Нова нотатка')).toBeTruthy()
        );
        expect(screen.getAllByRole('heading', { name: 'Town' })).toHaveLength(1);
    });

    it('hides open-map when the child map is not in the view', async () => {
        vi.mocked(api.getWorldView).mockResolvedValue({
            ...view(),
            maps: view().maps.filter((m) => m.id === 'm1'),
        });
        renderClient('m1');

        click(await screen.findByRole('button', { name: 'Town' }));

        await screen.findByRole('dialog', { name: 'Town' });

        expect(screen.queryByRole('button', { name: 'Відкрити карту' })).toBeNull();
    });

    it('double-click on a pin with an open child map opens it', async () => {
        renderClient('m1');

        fireEvent.doubleClick(
            await screen.findByRole('button', { name: 'Town' })
        );

        expect(push).toHaveBeenCalledWith('/campaigns/c1/world?map=m2');
    });

    it('search by description finds the place and selects it', async () => {
        renderClient('m1');

        await screen.findByRole('button', { name: 'Town' });

        fireEvent.change(screen.getByLabelText('Пошук місць'), {
            target: { value: 'market' },
        });
        await waitFor(() =>
            expect(
                screen.getAllByRole('button', { name: 'Town' }).length
            ).toBe(2)
        );
        fireEvent.click(screen.getAllByRole('button', { name: 'Town' })[0]);

        expect(await screen.findByRole('dialog', { name: 'Town' })).toBeTruthy();
    });

    it('opens the notes panel from the bubble', async () => {
        renderClient('m1');

        click(await screen.findByRole('button', { name: 'Town' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Докладніше' }));

        await waitFor(() =>
            expect(screen.getByLabelText('Нова нотатка')).toBeTruthy()
        );
        expect(screen.queryByRole('dialog', { name: 'Town' })).toBeNull();
    });
});
