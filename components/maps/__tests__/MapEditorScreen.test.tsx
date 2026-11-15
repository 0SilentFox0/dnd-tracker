// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MapEditorScreen } from '../MapEditorScreen';

import { ConfirmContext } from '@/lib/hooks/common/confirm-context';

const touch = vi.hoisted(() => ({ value: false }));

const query = vi.hoisted(() => ({
    value: { isPending: true, isError: false } as Record<string, unknown>,
}));

const battleMapCapture = vi.hoisted(() => ({
    current: null as {
        map: { background: string | null };
        editing: { edges: unknown };
    } | null,
}));

vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<object>()),
    useCoarsePointer: () => touch.value,
    useUnsavedChangesGuard: () => undefined,
}));
vi.mock('@/lib/hooks/battle-maps', () => ({
    useBattleMap: () => query.value,
    useBattleMapTiles: () => ({ data: { version: 1, chunks: {} } }),
    usePatchBattleMapTiles: () => ({
        mutate: vi.fn(),
        isPending: false,
        isError: false,
    }),
    useBattleMapMutations: () => ({
        update: { mutate: vi.fn(), isPending: false },
    }),
}));
vi.mock('@/lib/hooks/battle-maps/useMapEditorDraft', async (orig) => orig());
vi.mock('@/components/battle/map', () => ({
    BattleMap: (props: {
        map: { background: string | null };
        editing: { edges: unknown };
    }) => {
        battleMapCapture.current = props;

        return null;
    },
}));
vi.mock('next/link', () => ({
    default: ({
        children,
        href,
    }: {
        children: React.ReactNode;
        href: string;
    }) => <a href={href}>{children}</a>,
}));

afterEach(cleanup);

describe('MapEditorScreen', () => {
    it('on touch devices shows the desktop-only notice instead of the editor', () => {
        touch.value = true;
        render(<MapEditorScreen campaignId="c1" mapId="m1" />);

        expect(screen.getByText('maps.editor.desktopOnly')).toBeTruthy();
        expect(
            screen.getByRole('link', { name: /maps.editor.back/ })
        ).toBeTruthy();
    });

    it('on desktop does not show the notice', () => {
        touch.value = false;
        render(<MapEditorScreen campaignId="c1" mapId="m1" />);

        expect(screen.queryByText('maps.editor.desktopOnly')).toBeNull();
    });

    it('renders the background, cell and edge panels', () => {
        touch.value = false;
        query.value = {
            isPending: false,
            isError: false,
            data: {
                id: 'm1',
                name: 'Cave',
                cols: 10,
                rows: 8,
                version: 1,
                updatedAt: '',
                map: { cols: 10, rows: 8, background: null, opacity: 0.35 },
                walls: [],
                bars: [],
            },
        };
        render(
            <QueryClientProvider client={new QueryClient()}>
                <ConfirmContext.Provider value={vi.fn() as never}>
                    <MapEditorScreen campaignId="c1" mapId="m1" />
                </ConfirmContext.Provider>
            </QueryClientProvider>
        );

        fireEvent.mouseDown(
            screen.getByRole('tab', { name: 'maps.editor.panels.background' })
        );

        expect(
            screen.getByText('battleSetup.map.defaultBackground')
        ).toBeTruthy();

        fireEvent.mouseDown(
            screen.getByRole('tab', { name: 'maps.editor.panels.cells' })
        );
        expect(screen.getByText('battleSetup.map.drawing')).toBeTruthy();

        fireEvent.mouseDown(
            screen.getByRole('tab', { name: 'maps.editor.panels.edges' })
        );
        expect(screen.getByText('maps.editor.edges')).toBeTruthy();

        fireEvent.mouseDown(
            screen.getByRole('tab', { name: 'maps.editor.panels.tiles' })
        );
        expect(
            screen.getByRole('group', { name: 'maps.editor.tiles.layers' })
        ).toBeTruthy();
        expect(
            screen.getByRole('group', { name: 'maps.editor.tiles.tools' })
        ).toBeTruthy();
    });

    it('disables edge editing and hides the photo while the tile panel is active', () => {
        touch.value = false;
        query.value = {
            isPending: false,
            isError: false,
            data: {
                id: 'm1',
                name: 'Cave',
                cols: 10,
                rows: 8,
                version: 1,
                updatedAt: '',
                map: {
                    cols: 10,
                    rows: 8,
                    background:
                        'https://demo.supabase.co/storage/v1/object/public/battle-maps/cave.png',
                    opacity: 0.35,
                },
                walls: [],
                bars: [],
            },
        };

        render(
            <QueryClientProvider client={new QueryClient()}>
                <ConfirmContext.Provider value={vi.fn() as never}>
                    <MapEditorScreen campaignId="c1" mapId="m1" />
                </ConfirmContext.Provider>
            </QueryClientProvider>
        );

        fireEvent.mouseDown(
            screen.getByRole('tab', { name: 'maps.editor.panels.edges' })
        );
        fireEvent.click(
            screen.getByRole('button', {
                name: 'battleSetup.map.tools.edge-wall',
            })
        );
        expect(battleMapCapture.current?.editing.edges).toBeTruthy();

        fireEvent.mouseDown(
            screen.getByRole('tab', { name: 'maps.editor.panels.tiles' })
        );

        expect(battleMapCapture.current?.editing.edges).toBeFalsy();
        expect(battleMapCapture.current?.map.background).toBeNull();
    });

    it('shows image previews for the selected tile layer palette', () => {
        touch.value = false;
        query.value = {
            isPending: false,
            isError: false,
            data: {
                id: 'm1',
                name: 'Cave',
                cols: 10,
                rows: 8,
                version: 1,
                updatedAt: '',
                map: { cols: 10, rows: 8, background: null, opacity: 0.35 },
                walls: [],
                bars: [],
            },
        };

        render(
            <QueryClientProvider client={new QueryClient()}>
                <ConfirmContext.Provider value={vi.fn() as never}>
                    <MapEditorScreen campaignId="c1" mapId="m1" />
                </ConfirmContext.Provider>
            </QueryClientProvider>
        );

        fireEvent.mouseDown(
            screen.getByRole('tab', { name: 'maps.editor.panels.tiles' })
        );

        const selectedTileName = "Кам'яна підлога";

        const selectedTileCard = screen.getByRole('button', {
            name: selectedTileName,
        });

        expect(selectedTileCard.querySelector('img')).toBeTruthy();
        expect(
            screen
                .getByRole('button', { name: 'maps.editor.tiles.tool.brush' })
                .getAttribute('aria-pressed')
        ).toBe('true');
    });

    it('allows 120 columns on a map without a background', () => {
        touch.value = false;
        query.value = {
            isPending: false,
            isError: false,
            data: {
                id: 'm1',
                name: 'Cave',
                cols: 10,
                rows: 8,
                version: 1,
                updatedAt: '',
                map: { cols: 10, rows: 8, background: null, opacity: 0.35 },
                walls: [],
                bars: [],
            },
        };
        render(
            <QueryClientProvider client={new QueryClient()}>
                <ConfirmContext.Provider value={vi.fn() as never}>
                    <MapEditorScreen campaignId="c1" mapId="m1" />
                </ConfirmContext.Provider>
            </QueryClientProvider>
        );

        expect(
            screen.getByRole('group', { name: 'maps.editor.tiles.layers' })
        ).toBeTruthy();
        expect(battleMapCapture.current?.map.background).toBeNull();

        const cols = document.getElementById('map-cols') as HTMLInputElement;

        fireEvent.change(cols, { target: { value: '120' } });
        fireEvent.blur(cols);
        expect(cols.value).toBe('120');
    });
});
