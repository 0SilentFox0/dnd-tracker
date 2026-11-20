// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DmMarkerBubble } from '../DmMarkerBubble';
import { WorldEditorContext } from '../WorldEditorContext';

import { renderWithConfirm } from '@/components/ui/__tests__/uk-intl';
import type { WorldEditorCtx } from '@/lib/hooks/world';
import type { WorldMapSummary, WorldMarker } from '@/types/world';

vi.unmock('next-intl');

vi.mock('@/components/world/editor/maps/NewWorldMapDialog', () => ({
    NewWorldMapDialog: ({
        open,
        parentMarker,
    }: {
        open: boolean;
        parentMarker?: { id: string };
    }) => (open ? <span>new-map:{parentMarker?.id}</span> : null),
}));

vi.mock('@/components/world/editor/MoveMapMenu', () => ({
    MoveMapMenu: ({ map }: { map: { id: string } }) => (
        <span>move-menu:{map.id}</span>
    ),
}));

const update = vi.fn();

const remove = vi.fn();

const openMap = vi.fn();

const removeMap = vi.fn();

const marker = (over: Partial<WorldMarker> = {}) =>
    ({
        id: 'k1',
        kind: 'point',
        name: 'Місто',
        icon: 'city',
        description: null,
        alwaysVisible: false,
        childMapId: null,
        ...over,
    }) as WorldMarker;

const renderBubble = (
    m: WorldMarker,
    actions = { onMore: vi.fn(), onClose: vi.fn() }
) => {
    const ctx = {
        campaignId: 'c1',
        detail: { map: { id: 'm1' }, markers: [m] },
        maps: [
            { id: 'm1', name: 'Світ', parentMapId: null },
            { id: 'm2', name: 'Печера', parentMapId: 'm1' },
        ] as WorldMapSummary[],
        selectedId: m.id,
        select: vi.fn(),
        openMap,
        redraw: vi.fn(),
        redrawId: null,
        editor: {
            marker: {
                update: { mutateOk: update },
                remove: { mutateOk: remove },
            },
            map: {
                move: { mutateOk: vi.fn() },
                remove: { mutateOk: removeMap },
            },
        },
    } as unknown as WorldEditorCtx;

    renderWithConfirm(
        <QueryClientProvider client={new QueryClient()}>
            <WorldEditorContext.Provider value={ctx}>
                <DmMarkerBubble marker={m} actions={actions} />
            </WorldEditorContext.Provider>
        </QueryClientProvider>
    );

    return actions;
};

beforeEach(() => {
    remove.mockResolvedValue(true);
    removeMap.mockResolvedValue(true);
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('DmMarkerBubble', () => {
    it('without a child map offers to create one for this marker', () => {
        renderBubble(marker());

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Створити карту для цього місця',
            })
        );

        expect(screen.getByText('new-map:k1')).toBeTruthy();
        expect(screen.queryByText(/move-menu/)).toBeNull();
    });

    it('with a child map opens it and offers moving it', () => {
        renderBubble(marker({ childMapId: 'm2' }));

        fireEvent.click(screen.getByRole('button', { name: 'Відкрити' }));

        expect(openMap).toHaveBeenCalledWith('m2');
        expect(screen.getByText('move-menu:m2')).toBeTruthy();
    });

    it('saves the name on blur and the known-location switch', () => {
        renderBubble(marker());

        const input = screen.getByLabelText('Назва');

        fireEvent.change(input, { target: { value: 'Столиця' } });
        fireEvent.blur(input);

        expect(update).toHaveBeenCalledWith({
            id: 'k1',
            data: { name: 'Столиця' },
        });

        fireEvent.click(screen.getByRole('switch'));

        expect(update).toHaveBeenCalledWith({
            id: 'k1',
            data: { alwaysVisible: true },
        });
    });

    it('redraw is offered only for zones', () => {
        renderBubble(marker());

        expect(
            screen.queryByRole('button', { name: /Перемалювати/ })
        ).toBeNull();

        cleanup();
        renderBubble(marker({ kind: 'zone' }));

        expect(
            screen.getByRole('button', { name: /Перемалювати/ })
        ).toBeTruthy();
    });

    it('delete asks for confirmation first', async () => {
        renderBubble(marker());

        fireEvent.click(screen.getByRole('button', { name: /Видалити/ }));

        expect(remove).not.toHaveBeenCalled();

        await screen.findByText('Маркер буде видалено.');

        fireEvent.click(
            screen.getAllByRole('button', { name: 'Видалити' }).at(-1)!
        );

        await waitFor(() => expect(remove).toHaveBeenCalledWith('k1'));
    });

    it('Докладніше and close go through the actions', () => {
        const actions = renderBubble(marker());

        fireEvent.click(screen.getByRole('button', { name: 'Докладніше' }));
        fireEvent.click(screen.getByRole('button', { name: 'Закрити' }));

        expect(actions.onMore).toHaveBeenCalled();
        expect(actions.onClose).toHaveBeenCalled();
    });

    it('edits the public description in place', () => {
        renderBubble(marker({ description: 'Старе' }));

        const area = screen.getByLabelText('Опис');

        fireEvent.change(area, { target: { value: 'Нове' } });
        fireEvent.blur(area);

        expect(update).toHaveBeenCalledWith({
            id: 'k1',
            data: { description: 'Нове' },
        });
    });

    it('picks an icon for points and offers a colour for zones', () => {
        renderBubble(marker());

        expect(screen.getByRole('group', { name: 'Іконка' })).toBeTruthy();
        expect(screen.queryByLabelText('Колір зони')).toBeNull();

        cleanup();
        renderBubble(marker({ kind: 'zone' }));

        expect(screen.queryByRole('group', { name: 'Іконка' })).toBeNull();
        expect(screen.getByLabelText('Колір зони')).toBeTruthy();
    });

    it('deletes the nested map after confirmation', async () => {
        renderBubble(marker({ childMapId: 'm2' }));

        fireEvent.click(screen.getByRole('button', { name: 'Видалити карту' }));

        await screen.findByText(/Маркери й картинка карти будуть видалені/);

        fireEvent.click(
            screen.getAllByRole('button', { name: 'Видалити' }).at(-1)!
        );

        await waitFor(() => expect(removeMap).toHaveBeenCalledWith('m2'));
    });
});
