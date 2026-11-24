// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LayersPanel } from '../LayersPanel';

import { renderWithConfirm } from '@/components/ui/__tests__/uk-intl';
import { WorldEditorContext } from '@/components/world/editor/WorldEditorContext';
import type { WorldEditorCtx } from '@/lib/hooks/world';
import type { WorldLayer, WorldMarker } from '@/types/world';

vi.unmock('next-intl');

vi.mock('@/lib/hooks/world/useWorldMapUpload', () => ({
    useWorldMapUpload: () => ({
        upload: vi.fn(),
        discard: vi.fn(),
        uploading: false,
    }),
}));

const create = vi.fn();

const update = vi.fn();

const setHeroes = vi.fn();

const remove = vi.fn();

const layer = (o: Partial<WorldLayer> = {}): WorldLayer => ({
    id: 'l1',
    mapId: 'm1',
    name: 'Море',
    color: null,
    visibility: 'dm',
    heroIds: [],
    sortOrder: 0,
    imageUrl: null,
    rect: { x: 0, y: 0, w: 1, h: 1 },
    opacity: 1,
    icon: null,
    zoneOpacity: null,
    zoneLabels: 'auto',
    ...o,
});

const renderPanel = (
    layers: WorldLayer[],
    markers: Partial<WorldMarker>[] = []
) => {
    const ctx = {
        campaignId: 'c1',
        detail: {
            map: { id: 'm1', width: 800, height: 600 },
            markers,
            layers,
        },
        editor: {
            layers: {
                create: { mutateOk: create },
                update: { mutateOk: update },
                setHeroes: { mutateOk: setHeroes },
                remove: { mutateOk: remove },
            },
        },
    } as unknown as WorldEditorCtx;

    const onActive = vi.fn();

    renderWithConfirm(
        <WorldEditorContext.Provider value={ctx}>
            <LayersPanel
                campaignId="c1"
                layers={layers}
                activeId={null}
                onActive={onActive}
                heroes={[{ id: 'h1', name: 'Арвен' }]}
                imageEdit={{ layerId: null, set: vi.fn() }}
            />
        </WorldEditorContext.Provider>
    );

    return { onActive };
};

beforeEach(() => {
    create.mockResolvedValue(true);
    update.mockResolvedValue(true);
    setHeroes.mockResolvedValue(true);
    remove.mockResolvedValue(true);
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('LayersPanel', () => {
    it('edits one layer at a time and keeps the other fields available in tabs', () => {
        renderPanel(
            [
                layer({ id: 'a', name: 'Море' }),
                layer({ id: 'b', name: 'Гори', visibility: 'heroes' }),
            ]
        );

        expect(screen.getByRole('textbox', { name: 'Назва шару' })).toHaveValue(
            'Море'
        );
        expect(
            screen.queryByRole('combobox', { name: 'Видимий для' })
        ).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Гори' }));
        fireEvent.keyDown(screen.getByRole('tab', { name: 'Доступ' }), {
            key: 'Enter',
        });

        expect(screen.getByRole('textbox', { name: 'Назва шару' })).toHaveValue(
            'Гори'
        );
        expect(screen.getByRole('checkbox', { name: 'Арвен' })).toBeVisible();
    });

    it('creates a layer without a map id', () => {
        renderPanel([]);

        fireEvent.click(screen.getByRole('button', { name: 'Додати шар' }));

        expect(create).toHaveBeenCalledWith({ name: 'Шар 1' });
    });

    it('shows the hero picker only for heroes visibility', () => {
        renderPanel([layer({ id: 'b', visibility: 'heroes' })]);

        fireEvent.keyDown(screen.getByRole('tab', { name: 'Доступ' }), {
            key: 'Enter',
        });

        expect(screen.getAllByText('Арвен')).toHaveLength(1);

        fireEvent.click(screen.getByRole('checkbox'));

        expect(setHeroes).toHaveBeenCalledWith({ id: 'b', heroIds: ['h1'] });
    });

    it('asks for a mode when the layer has markers', async () => {
        renderPanel([layer()], [{ id: 'k', layerId: 'l1' }]);

        fireEvent.click(screen.getByRole('button', { name: 'Видалити шар' }));
        fireEvent.click(
            await screen.findByRole('button', { name: 'Залишити маркери' })
        );

        expect(remove).toHaveBeenCalledWith({ id: 'l1', mode: 'ungroup' });
    });

    it('warns that kept markers become visible to everyone', async () => {
        renderPanel([layer()], [{ id: 'k', layerId: 'l1' }]);

        fireEvent.click(screen.getByRole('button', { name: 'Видалити шар' }));

        expect(await screen.findByText(/стануть видимі всім/)).toBeTruthy();
    });

    it('deletes with markers on explicit choice', async () => {
        renderPanel([layer()], [{ id: 'k', layerId: 'l1' }]);

        fireEvent.click(screen.getByRole('button', { name: 'Видалити шар' }));
        fireEvent.click(
            await screen.findByRole('button', { name: 'Видалити з маркерами' })
        );

        expect(remove).toHaveBeenCalledWith({ id: 'l1', mode: 'delete' });
    });

    it('deletes an empty layer after a plain confirmation', async () => {
        renderPanel([layer()]);

        fireEvent.click(screen.getByRole('button', { name: 'Видалити шар' }));
        fireEvent.click(
            await screen.findByRole('button', { name: 'Видалити' })
        );

        await waitFor(() =>
            expect(remove).toHaveBeenCalledWith({ id: 'l1', mode: undefined })
        );
    });

    it('commits the zone opacity from the slider and resets it to null', async () => {
        renderPanel([layer({ zoneOpacity: 0.4 })]);

        fireEvent.change(
            screen.getByRole('slider', { name: 'Прозорість зон' }),
            {
                target: { value: '0.3' },
            }
        );

        await waitFor(() =>
            expect(update).toHaveBeenCalledWith({
                id: 'l1',
                data: { zoneOpacity: 0.3 },
            })
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'За замовчуванням' })
        );

        await waitFor(() =>
            expect(update).toHaveBeenCalledWith({
                id: 'l1',
                data: { zoneOpacity: null },
            })
        );
    });

    it('offers the zone opacity reset only for a custom value', () => {
        renderPanel([layer()]);

        expect(
            screen.queryByRole('button', { name: 'За замовчуванням' })
        ).toBeNull();
    });
});
