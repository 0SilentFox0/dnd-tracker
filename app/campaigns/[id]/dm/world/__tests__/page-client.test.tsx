// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WorldEditorPageClient } from '../page-client';

const replace = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace }),
    usePathname: () => '/campaigns/c1/dm/world',
}));

const detail = {
    map: { id: 'm2', name: 'Печера', entryX: 0.5, entryY: 0.5 },
    markers: [{ id: 'k1', name: 'Місто' }],
    heroes: [],
};

vi.mock('@/lib/hooks/world/useWorldMaps', () => ({
    useWorldMaps: () => ({
        data: [
            { id: 'm1', name: 'Світ' },
            { id: 'm2', name: 'Печера' },
        ],
        isPending: false,
        isError: false,
    }),
}));
vi.mock('@/lib/hooks/world/useWorldMap', () => ({
    useWorldMap: () => ({ data: detail, isPending: false, isError: false }),
}));
vi.mock('@/lib/hooks/world/useWorldEditor', () => ({
    useWorldEditor: () => ({
        marker: { create: {}, update: {}, remove: {} },
        map: { update: {} },
    }),
}));
vi.mock('@/lib/hooks/world/useWorldHeroes', () => ({
    useWorldHeroes: () => ({ heroes: [] }),
}));
vi.mock('@/lib/hooks/world/useHeroEyes', () => ({
    useHeroEyes: () => ({ asHeroId: null, setAsHeroId: vi.fn(), view: {} }),
}));
vi.mock('@/lib/hooks/world/useRemoveMarker', () => ({
    useRemoveMarker: () => undefined,
}));
vi.mock('@/components/world/editor/WorldToolbar', () => ({
    WorldToolbar: ({
        drawing,
        children,
    }: {
        drawing: { tool: string; setTool(t: string, pin?: boolean): void };
        children?: React.ReactNode;
    }) => (
        <div>
            <button type="button" onClick={() => drawing.setTool('move')}>
                tool:{drawing.tool}
            </button>
            <button
                type="button"
                onClick={() => drawing.setTool('point', true)}
            >
                pin-point
            </button>
            {children}
        </div>
    ),
    WorldToolHint: () => null,
}));
vi.mock('@/components/world/travel/TravelPanel', () => ({
    TravelPanel: ({
        actions: { onMoved },
    }: {
        actions: { onMoved(e: unknown): void };
    }) => (
        <div>
            <span>travel-panel</span>
            <button
                type="button"
                onClick={() =>
                    onMoved({ kind: 'exit', fromMapId: 'm2', destMapId: 'm1' })
                }
            >
                exit
            </button>
            <button
                type="button"
                onClick={() =>
                    onMoved({
                        kind: 'travel',
                        fromMapId: 'm2',
                        destMapId: 'm2',
                    })
                }
            >
                plain
            </button>
        </div>
    ),
}));
vi.mock('@/components/world/WorldMapView', () => ({
    WorldMapView: ({
        slots,
    }: {
        slots?: { card?: { content: React.ReactNode } };
    }) => <div>map{slots?.card?.content}</div>,
}));
vi.mock('@/components/world/editor/panels/HeroEyesSelect', () => ({
    HeroEyesSelect: () => null,
}));
vi.mock('@/components/world/editor/maps/NewWorldMapDialog', () => ({
    NewWorldMapDialog: () => null,
}));
vi.mock('@/components/world/editor/WorldBreadcrumbs', () => ({
    WorldBreadcrumbs: () => null,
}));
vi.mock('@/components/world/MapTree', () => ({
    MapTree: ({
        footer,
        onOpen,
    }: {
        footer?: React.ReactNode;
        onOpen(id: string): void;
    }) => (
        <div>
            <button type="button" onClick={() => onOpen('m1')}>
                tree-open-m1
            </button>
            {footer}
        </div>
    ),
}));
vi.mock('@/components/world/editor/ModeSwitch', () => ({
    ModeSwitch: ({ onChange }: { onChange(m: 'build' | 'play'): void }) => (
        <button type="button" onClick={() => onChange('play')}>
            mode-play
        </button>
    ),
}));
vi.mock('@/components/world/editor/DmMarkerBubble', () => ({
    DmMarkerBubble: ({
        actions,
    }: {
        actions: { onMore(): void; onClose(): void };
    }) => (
        <div>
            <span>bubble</span>
            <button type="button" onClick={actions.onMore}>
                more
            </button>
            <button type="button" onClick={actions.onClose}>
                close-bubble
            </button>
        </div>
    ),
}));
vi.mock('@/components/world/editor/maps/WorldMapSettings', () => ({
    WorldMapSettings: () => null,
}));
vi.mock('@/components/world/editor/panels/WorldMarkerPanel', () => ({
    WorldMarkerPanel: () => <span>marker-panel</span>,
}));
vi.mock('@/components/ui/responsive-dialog', () => ({
    ResponsiveDialog: ({
        open,
        children,
    }: {
        open: boolean;
        children: React.ReactNode;
    }) => (open ? <>{children}</> : null),
}));

beforeEach(() => {
    vi.stubGlobal('matchMedia', (q: string) => ({
        matches: false,
        media: q,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    }));
});

afterEach(() => {
    cleanup();
    replace.mockReset();
});

describe('WorldEditorPageClient', () => {
    it('після «Вийти» відкриває батьківську карту, інструмент лишається «Переміщення»', () => {
        render(
            <WorldEditorPageClient
                campaignId="c1"
                campaignName="Кампанія"
                mapId="m2"
            />
        );

        fireEvent.click(screen.getByText('tool:select'));
        fireEvent.click(screen.getByText('exit'));

        expect(replace).toHaveBeenCalledWith('/campaigns/c1/dm/world?map=m1');
        expect(screen.getByText('tool:move')).toBeTruthy();
        expect(screen.getByText('travel-panel')).toBeTruthy();
    });

    it('initialSelectedId показує бульбашку, «Докладніше» відкриває панель маркера', () => {
        render(
            <WorldEditorPageClient
                campaignId="c1"
                campaignName="Кампанія"
                mapId="m2"
                initialSelectedId="k1"
            />
        );

        expect(screen.getByText('bubble')).toBeTruthy();
        expect(screen.queryByText('marker-panel')).toBeNull();

        fireEvent.click(screen.getByText('more'));

        expect(screen.getByText('marker-panel')).toBeTruthy();
        expect(screen.queryByText('bubble')).toBeNull();
    });

    it('закриття бульбашки знімає вибір', () => {
        render(
            <WorldEditorPageClient
                campaignId="c1"
                campaignName="Кампанія"
                mapId="m2"
                initialSelectedId="k1"
            />
        );

        fireEvent.click(screen.getByText('close-bubble'));

        expect(screen.queryByText('bubble')).toBeNull();
    });

    it('режим «Гра» вмикає інструмент героїв і панель подорожі', () => {
        render(
            <WorldEditorPageClient
                campaignId="c1"
                campaignName="Кампанія"
                mapId="m2"
            />
        );

        fireEvent.click(screen.getByText('mode-play'));

        expect(screen.getByText('tool:move')).toBeTruthy();
        expect(screen.getByText('travel-panel')).toBeTruthy();
    });

    it('дерево карт відкриває карту за кліком', () => {
        render(
            <WorldEditorPageClient
                campaignId="c1"
                campaignName="Кампанія"
                mapId="m2"
            />
        );

        fireEvent.click(screen.getByText('world.tree.toggle'));
        fireEvent.click(screen.getByText('tree-open-m1'));

        expect(replace).toHaveBeenCalledWith('/campaigns/c1/dm/world?map=m1');
    });

    it('без initialSelectedId маркер не вибрано', () => {
        render(
            <WorldEditorPageClient
                campaignId="c1"
                campaignName="Кампанія"
                mapId="m2"
            />
        );

        expect(screen.queryByText('marker-panel')).toBeNull();
        expect(screen.queryByText('bubble')).toBeNull();
    });

    it('звичайне переміщення карту не змінює', () => {
        render(
            <WorldEditorPageClient
                campaignId="c1"
                campaignName="Кампанія"
                mapId="m2"
            />
        );

        fireEvent.click(screen.getByText('tool:select'));
        fireEvent.click(screen.getByText('plain'));

        expect(replace).not.toHaveBeenCalled();
    });

    describe('Esc ladder', () => {
        const esc = () => fireEvent.keyDown(document.body, { key: 'Escape' });

        const renderSelected = () =>
            render(
                <WorldEditorPageClient
                    campaignId="c1"
                    campaignName="Кампанія"
                    mapId="m2"
                    initialSelectedId="k1"
                />
            );

        it('details close first, then the bubble: one step per press', () => {
            renderSelected();
            fireEvent.click(screen.getByText('more'));

            expect(screen.getByText('marker-panel')).toBeTruthy();

            esc();

            expect(screen.queryByText('marker-panel')).toBeNull();
            expect(screen.getByText('bubble')).toBeTruthy();

            esc();

            expect(screen.queryByText('bubble')).toBeNull();
        });

        it('a pinned tool steps back to select before the selection clears', () => {
            renderSelected();
            fireEvent.click(screen.getByText('pin-point'));

            expect(screen.getByText('tool:point')).toBeTruthy();
            expect(screen.queryByText('bubble')).toBeNull();

            esc();

            expect(screen.getByText('tool:select')).toBeTruthy();
            expect(screen.getByText('bubble')).toBeTruthy();

            esc();

            expect(screen.queryByText('bubble')).toBeNull();
        });

        it('Esc with nothing open changes nothing', () => {
            render(
                <WorldEditorPageClient
                    campaignId="c1"
                    campaignName="Кампанія"
                    mapId="m2"
                />
            );
            esc();

            expect(screen.getByText('tool:select')).toBeTruthy();
        });
    });
});
