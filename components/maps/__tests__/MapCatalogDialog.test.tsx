// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MapCatalogDialog } from '../MapCatalogDialog';

import { useMapCatalog } from '@/lib/hooks/battle-maps/useMapCatalog';
import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';
import type { MapCatalogEntry } from '@/types/map-catalog';

vi.mock('@/lib/hooks/battle-maps/useMapCatalog', () => ({
    useMapCatalog: vi.fn(),
}));
const entry: MapCatalogEntry = {
    id: 'maps/cave/Room.dd2vtt',
    category: 'cave / rooms',
    name: 'Room',
    filePath: 'maps/cave/Room.dd2vtt',
    sourceUrl:
        'https://github.com/mbround18/vtt-maps/blob/main/maps/cave/Room.dd2vtt',
    downloadUrl:
        'https://raw.githubusercontent.com/mbround18/vtt-maps/main/maps/cave/Room.dd2vtt',
    license: 'CC-BY-SA-4.0',
    attribution: 'mbround18/vtt-maps',
    previewUrl: '/assets/map-catalog/room.webp',
    importable: true,
};

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

function renderDialog(onImport = vi.fn().mockResolvedValue({ id: 'map-1' })) {
    vi.mocked(useMapCatalog).mockReturnValue({
        data: [entry],
        isLoading: false,
        isError: false,
    } as never);
    const onOpenChange = vi.fn();

    const view = renderWithIntl(
        <MapCatalogDialog
            open
            onOpenChange={onOpenChange}
            onImport={onImport}
        />,
        { locale: 'en', namespaces: ['common', 'maps'] }
    );

    return { ...view, onImport, onOpenChange };
}

describe('MapCatalogDialog', () => {
    it('filters catalog entries by category and shows preview attribution', async () => {
        renderDialog();
        await screen.findByRole('img', { name: 'Room' });
        expect(screen.getByText(/maps.catalog.attribution/)).toBeTruthy();
        fireEvent.change(screen.getByPlaceholderText('maps.catalog.search'), {
            target: { value: 'cave' },
        });
        expect(screen.getAllByText('Room').length).toBeGreaterThan(0);
        fireEvent.change(screen.getByPlaceholderText('maps.catalog.search'), {
            target: { value: 'forest' },
        });
        expect(screen.getByText('maps.catalog.noResults')).toBeTruthy();
    });

    it('imports only after explicit add and closes on success', async () => {
        const { onImport, onOpenChange } = renderDialog();

        await screen.findByRole('img', { name: 'Room' });
        expect(onImport).not.toHaveBeenCalled();
        fireEvent.click(
            screen.getByRole('button', { name: 'maps.catalog.add' })
        );
        await waitFor(() => expect(onImport).toHaveBeenCalledWith(entry));
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('keeps the dialog open and shows errors when adding fails', async () => {
        const onImport = vi
            .fn()
            .mockRejectedValue(new Error('Storage is unavailable'));

        const { onOpenChange } = renderDialog(onImport);

        await screen.findByRole('img', { name: 'Room' });
        fireEvent.click(
            screen.getByRole('button', { name: 'maps.catalog.add' })
        );
        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Storage is unavailable'
        );
        expect(onOpenChange).not.toHaveBeenCalledWith(false);
    });

    it('allows closing without importing and offers retry after catalog failure', async () => {
        const { onImport, onOpenChange } = renderDialog();

        await screen.findByRole('img', { name: 'Room' });
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
        expect(onOpenChange).toHaveBeenCalledWith(false);
        expect(onImport).not.toHaveBeenCalled();

        cleanup();

        const refetch = vi.fn();

        vi.mocked(useMapCatalog).mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: true,
            refetch,
        } as never);
        await renderWithIntl(
            <MapCatalogDialog open onOpenChange={vi.fn()} onImport={vi.fn()} />,
            { locale: 'en', namespaces: ['common', 'maps'] }
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'maps.catalog.retry' })
        );
        expect(refetch).toHaveBeenCalled();
    });
});
