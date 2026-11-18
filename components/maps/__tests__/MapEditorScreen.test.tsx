// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MapEditorScreen } from '../MapEditorScreen';

import { ConfirmContext } from '@/lib/hooks/common/confirm-context';
import { makeT } from '@/lib/i18n/test/mock-t';
import ukMaps from '@/messages/uk/maps.json';

const touch = vi.hoisted(() => ({ value: false }));

const query = vi.hoisted(() => ({
    value: { isPending: true, isError: false } as Record<string, unknown>,
}));

const tileSaveMutation = vi.hoisted(() => vi.fn());

const battleMapCapture = vi.hoisted(() => ({
    current: null as {
        map: {
            background: string | null;
            cols?: number;
            rows?: number;
            walls?: string[];
            doors?: Record<string, unknown>;
        };
        editing: { edges: unknown };
        actions: { onStroke: (points: { x: number; y: number }[]) => void };
    } | null,
}));

vi.mock('next-intl', async (orig) => ({
    ...(await orig<object>()),
    useTranslations: (namespace?: string) => {
        if (namespace !== 'maps.tileLabels') return makeT(namespace);

        const labels = ukMaps.tileLabels as Record<string, string>;

        return Object.assign((key: string) => labels[key] ?? key, {
            has: (key: string) => key in labels,
        });
    },
}));
vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<object>()),
    useCoarsePointer: () => touch.value,
    useUnsavedChangesGuard: () => undefined,
}));
vi.mock('@/lib/hooks/battle-maps/useBattleMaps', async (orig) => ({
    ...(await orig<object>()),
    useBattleMap: () => query.value,
    useBattleMapTiles: () => ({ data: { version: 1, chunks: {} } }),
    usePatchBattleMapTiles: () => ({
        mutate: tileSaveMutation,
        isPending: false,
        isError: false,
    }),
    useBattleMapMutations: () => ({
        update: { mutate: vi.fn(), isPending: false },
    }),
}));
vi.mock('@/components/battle/map', () => ({
    BattleMap: (props: {
        map: {
            background: string | null;
            cols?: number;
            rows?: number;
            walls?: string[];
            doors?: Record<string, unknown>;
        };
        editing: { edges: unknown };
        actions: { onStroke: (points: { x: number; y: number }[]) => void };
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

afterEach(() => {
    cleanup();
    tileSaveMutation.mockReset();
});

function renderTileEditor() {
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
}

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

    it('imports a UVTT file into the editor draft without saving it', async () => {
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

        const content = JSON.stringify({
            image: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAK',
            resolution: {
                map_origin: [0, 0],
                map_size: { x: 8, y: 6 },
                pixels_per_grid: 10,
            },
            line_of_sight: [[20, 10, 40, 10]],
        });

        fireEvent.change(
            screen.getByLabelText('maps.editor.import.chooseFile'),
            {
                target: {
                    files: [
                        new File([content], 'scene.uvtt', {
                            type: 'application/json',
                        }),
                    ],
                },
            }
        );

        await screen.findByText('maps.editor.import.help');
        expect(battleMapCapture.current?.map).toMatchObject({
            cols: 8,
            rows: 6,
            backgroundCols: 1,
            walls: ['2:0:s', '3:0:s'],
        });
        expect(tileSaveMutation).not.toHaveBeenCalled();
        expect(
            screen
                .getByRole('button', { name: 'maps.editor.save' })
                .hasAttribute('disabled')
        ).toBe(false);
    });

    it('reports skipped UVTT geometry after an import', async () => {
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

        const content = JSON.stringify({
            image: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAK',
            resolution: {
                map_origin: [0, 0],
                map_size: { x: 8, y: 6 },
                pixels_per_grid: 10,
            },
            line_of_sight: [
                [20, 10, 40, 10],
                [0, 0, 30, 30],
            ],
        });

        fireEvent.change(
            screen.getByLabelText('maps.editor.import.chooseFile'),
            {
                target: {
                    files: [
                        new File([content], 'scene.uvtt', {
                            type: 'application/json',
                        }),
                    ],
                },
            }
        );

        expect(
            await screen.findByText(/maps\.editor\.import\.warnings\.diagonal/)
        ).toBeTruthy();
    });

    it('filters texture cards by their localized label', () => {
        renderTileEditor();

        const search = screen.getByRole('searchbox', {
            name: 'maps.editor.tiles.search',
        });

        fireEvent.change(search, { target: { value: 'ЛАВ' } });

        expect(screen.getByRole('button', { name: 'Лава · 1' })).toBeTruthy();
        expect(
            screen.queryByRole('button', { name: "Кам'яна підлога" })
        ).toBeNull();
    });

    it('updates the active layer and its selected texture accessibly', () => {
        renderTileEditor();

        const objects = screen.getByRole('button', {
            name: 'maps.editor.tiles.layer.objects',
        });

        fireEvent.click(objects);

        expect(objects.getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByRole('button', { name: 'Бочка' })).toBeTruthy();
    });

    it('supports keyboard undo and redo while preserving shortcuts in the search field', () => {
        renderTileEditor();

        act(() => battleMapCapture.current?.actions.onStroke([{ x: 2, y: 3 }]));

        const save = screen.getByRole('button', {
            name: 'maps.editor.tiles.save',
        }) as HTMLButtonElement;

        const search = screen.getByRole('searchbox', {
            name: 'maps.editor.tiles.search',
        });

        expect(save.disabled).toBe(false);

        fireEvent.keyDown(search, { key: 'z', ctrlKey: true });
        expect(save.disabled).toBe(false);

        fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
        expect(save.disabled).toBe(true);

        fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
        expect(save.disabled).toBe(false);
    });

    it('saves dirty tile patches and marks them clean after success', () => {
        renderTileEditor();

        act(() => battleMapCapture.current?.actions.onStroke([{ x: 2, y: 3 }]));

        const save = screen.getByRole('button', {
            name: 'maps.editor.tiles.save',
        }) as HTMLButtonElement;

        fireEvent.click(save);

        expect(tileSaveMutation).toHaveBeenCalledWith(
            {
                expectedVersion: 1,
                patches: expect.arrayContaining([
                    expect.objectContaining({
                        layer: 'ground',
                        cx: 0,
                        cy: 0,
                        data: expect.any(String),
                    }),
                ]),
            },
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );

        const [, callbacks] = tileSaveMutation.mock.calls[0] as [
            unknown,
            { onSuccess: (value: { version: number }) => void },
        ];

        act(() => callbacks.onSuccess({ version: 2 }));

        expect(save.disabled).toBe(true);
    });
});
