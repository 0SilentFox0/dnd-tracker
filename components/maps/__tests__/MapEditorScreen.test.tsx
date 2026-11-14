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

vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<object>()),
    useCoarsePointer: () => touch.value,
    useUnsavedChangesGuard: () => undefined,
}));
vi.mock('@/lib/hooks/battle-maps', () => ({
    useBattleMap: () => query.value,
}));
vi.mock('@/lib/hooks/battle-maps/useMapEditorDraft', async (orig) => orig());
vi.mock('@/components/battle/map', () => ({ BattleMap: () => null }));
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

        expect(
            screen.getByText('battleSetup.map.defaultBackground')
        ).toBeTruthy();

        fireEvent.click(
            screen.getByRole('tab', { name: 'maps.editor.panels.cells' })
        );
        expect(screen.getByText('battleSetup.map.drawing')).toBeTruthy();

        fireEvent.click(
            screen.getByRole('tab', { name: 'maps.editor.panels.edges' })
        );
        expect(screen.getByText('maps.editor.edges')).toBeTruthy();
    });
});
