// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MapLibraryList } from '../MapLibraryList';

import { useMapLibrary } from '@/lib/hooks/battle-maps';
import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';

vi.mock('@/lib/hooks/battle-maps', () => ({ useMapLibrary: vi.fn() }));
vi.mock('../MapCatalogDialog', () => ({ MapCatalogDialog: () => null }));
vi.mock('@/lib/hooks/campaigns', () => ({
    useMapLibraryEnabled: vi.fn(() => true),
}));
vi.mock('@/components/content-copy/ContentCopyButton', () => ({
    ContentCopyButton: ({ kind }: { kind: string }) => (
        <button>copy-{kind}</button>
    ),
}));

afterEach(cleanup);

describe('MapLibraryList', () => {
    it('offers the catalog alongside normal map creation', async () => {
        vi.mocked(useMapLibrary).mockReturnValue({
            query: { isError: false },
            maps: [],
            actions: {
                importCatalogEntry: vi.fn(),
                create: vi.fn(),
                clone: vi.fn(),
                remove: vi.fn(),
            },
            createDialog: { open: false, setOpen: vi.fn(), isPending: false },
            catalog: { open: false, setOpen: vi.fn(), isPending: false },
            isLoading: false,
        } as never);
        await renderWithIntl(<MapLibraryList campaignId="c1" />, {
            locale: 'en',
            namespaces: ['common', 'maps', 'onboarding'],
        });
        expect(
            screen.getByRole('button', { name: 'maps.list.catalog' })
        ).toBeTruthy();
        expect(
            screen.getByRole('button', { name: 'maps.list.create' })
        ).toBeTruthy();
        expect(screen.getByRole('button', { name: 'copy-maps' })).toBeTruthy();
    });
});
