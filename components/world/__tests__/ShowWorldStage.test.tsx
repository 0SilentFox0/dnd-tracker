// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ShowStage } from '@/components/show/stage/ShowStage';
import { render } from '@/components/ui/__tests__/uk-intl';
import { getWorldMap, getWorldView } from '@/lib/api/world';
import type { ShowState } from '@/types/show';
import type { WorldMap, WorldMarker, WorldView } from '@/types/world';

vi.unmock('next-intl');

vi.mock('@/lib/api/world', () => ({
    getWorldView: vi.fn(),
    getWorldMap: vi.fn(),
}));
 
vi.mock('next/image', () => ({
    default: (p: { alt: string }) => <img alt={p.alt} />,
}));
vi.mock('@/components/world/WorldMapView', () => ({
    WorldMapView: (p: {
        detail: {
            map: { id: string };
            markers: { id: string }[];
            notes?: unknown[];
        };
        fog?: unknown;
        focus?: unknown;
        selectedId?: string;
    }) => (
        <div
            data-testid="map"
            data-map={p.detail.map.id}
            data-fog={p.fog ? '1' : '0'}
            data-focus={p.focus ? '1' : '0'}
            data-selected={p.selectedId ?? ''}
        >
            {JSON.stringify({
                markers: p.detail.markers,
                notes: p.detail.notes,
            })}
        </div>
    ),
}));

afterEach(cleanup);

beforeEach(() => vi.resetAllMocks());

const map = {
    id: 'm1',
    name: 'Світ',
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
} as WorldMap;

const marker = (id: string) =>
    ({ id, mapId: 'm1', x: 0.4, y: 0.4, name: id }) as WorldMarker;

const view = (markers: WorldMarker[]): WorldView => ({
    map,
    markers,
    heroes: [],
    reveals: [],
    maps: [],
    notes: [],
    fog: true,
});

const show = (over: Partial<ShowState> = {}) =>
    ({
        deckId: null,
        deckTitle: null,
        slide: null,
        nextImageUrl: null,
        audio: null,
        seq: 1,
        world: { mapId: 'm1' },
        ...over,
    }) as ShowState;

const renderStage = (s: ShowState, isDM = false, readOnly = false) =>
    render(
        <QueryClientProvider
            client={
                new QueryClient({
                    defaultOptions: { queries: { retry: false } },
                })
            }
        >
            <ShowStage
                show={s}
                campaignId="c1"
                isDM={isDM}
                readOnly={readOnly}
            />
        </QueryClientProvider>
    );

describe('ShowWorldStage', () => {
    it('гравець бачить карту з туманом', async () => {
        vi.mocked(getWorldView).mockResolvedValue(view([marker('k1')]));

        renderStage(show());

        const el = await screen.findByTestId('map');

        expect(el.getAttribute('data-fog')).toBe('1');
        expect(getWorldMap).not.toHaveBeenCalled();
    });

    it('фокус на видимому маркері центрує і підсвічує', async () => {
        vi.mocked(getWorldView).mockResolvedValue(view([marker('k1')]));

        renderStage(show({ world: { mapId: 'm1', focusMarkerId: 'k1' } }));

        const el = await screen.findByTestId('map');

        expect(el.getAttribute('data-focus')).toBe('1');
        expect(el.getAttribute('data-selected')).toBe('k1');
    });

    it('фокус прихованого маркера не застосовується', async () => {
        vi.mocked(getWorldView).mockResolvedValue(view([marker('k1')]));

        renderStage(show({ world: { mapId: 'm1', focusMarkerId: 'hidden' } }));

        const el = await screen.findByTestId('map');

        expect(el.getAttribute('data-focus')).toBe('0');
        expect(el.getAttribute('data-selected')).toBe('');
    });

    it('404 — «Карта недоступна»', async () => {
        vi.mocked(getWorldView).mockRejectedValue(new Error('404'));

        renderStage(show());

        expect(await screen.findByText('Карта недоступна')).toBeTruthy();
        expect(screen.queryByTestId('map')).toBeNull();
    });

    it('заглушка перекриває карту', () => {
        vi.mocked(getWorldView).mockResolvedValue(view([]));

        renderStage(show({ curtain: true }));

        expect(screen.getByText('Перерва — скоро продовжимо')).toBeTruthy();
        expect(screen.queryByTestId('map')).toBeNull();
        expect(getWorldView).not.toHaveBeenCalled();
    });

    it('ДМ бачить повну карту з підписом', async () => {
        vi.mocked(getWorldMap).mockResolvedValue({
            map,
            markers: [marker('k1')],
            heroes: [],
        });

        renderStage(show(), true);

        const el = await screen.findByTestId('map');

        expect(el.getAttribute('data-fog')).toBe('0');
        await waitFor(() =>
            expect(
                screen.getByText('Гравці бачать карту зі своїм туманом')
            ).toBeTruthy()
        );
        expect(getWorldView).not.toHaveBeenCalled();
    });

    it('режим гравця у ДМ: у DOM немає DM-only даних (dmNote, нотатки, приховані маркери)', async () => {
        const hero = {
            id: 'h1',
            name: 'Геро',
            avatar: null,
            mapId: 'm1',
            x: 0.1,
            y: 0.1,
            own: true,
        };

        vi.mocked(getWorldMap).mockResolvedValue({
            map,
            markers: [
                {
                    ...marker('seen'),
                    dmNote: 'DM-SECRET-NOTE',
                    alwaysVisible: false,
                },
                {
                    ...marker('hidden-marker'),
                    name: 'HIDDEN-NAME',
                    alwaysVisible: false,
                },
            ],
            heroes: [hero],
            notes: [{ id: 'n1', text: 'DM-NOTE-TEXT' } as never],
        });
        vi.mocked(getWorldView).mockResolvedValue({
            ...view([{ ...marker('seen'), dmNote: null }]),
            heroes: [hero],
            notes: [{ id: 'n2', text: 'PLAYER-NOTE' } as never],
        });

        renderStage(show(), true, true);

        const el = await screen.findByTestId('map');

        expect(getWorldView).toHaveBeenCalledWith('c1', {
            mapId: 'm1',
            asParty: true,
        });
        expect(el.textContent).not.toContain('DM-SECRET-NOTE');
        expect(el.textContent).not.toContain('HIDDEN-NAME');
        expect(el.textContent).not.toContain('NOTE');
        expect(
            screen.queryByText('Гравці бачать карту зі своїм туманом')
        ).toBeNull();
    });

    it('режим гравця без героїв: лише alwaysVisible маркери під туманом, без dmNote', async () => {
        vi.mocked(getWorldView).mockRejectedValue(new Error('400'));
        vi.mocked(getWorldMap).mockResolvedValue({
            map,
            markers: [
                {
                    ...marker('a'),
                    name: 'HIDDEN-NAME',
                    dmNote: 'DM-SECRET-NOTE',
                    alwaysVisible: false,
                },
                {
                    ...marker('b'),
                    dmNote: 'DM-SECRET-NOTE',
                    alwaysVisible: true,
                },
            ],
            heroes: [],
        });

        renderStage(show(), true, true);

        const el = await screen.findByTestId('map');

        expect(el.textContent).toContain('"id":"b"');
        expect(el.textContent).not.toContain('HIDDEN-NAME');
        expect(el.textContent).not.toContain('DM-SECRET-NOTE');
    });
});
