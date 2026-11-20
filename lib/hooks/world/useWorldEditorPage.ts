'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import type { WorldEditorCtx } from './types';
import { useHeroEyes } from './useHeroEyes';
import {
    MODE_HOME_TOOL,
    MODE_TOOLS,
    useMapDrawing,
    type WorldMode,
} from './useMapDrawing';
import { useMoveTarget } from './useMoveTarget';
import { useRemoveMarker } from './useRemoveMarker';
import { useWorldEditor } from './useWorldEditor';
import { useWorldHeroes } from './useWorldHeroes';
import { useWorldMap } from './useWorldMap';
import { useWorldMaps } from './useWorldMaps';

import { polygonCentroid } from '@/lib/utils/world/geometry';
import type {
    CreateWorldMarkerData,
    MapPoint,
    Polygon,
    WorldMarker,
} from '@/types/world';

const NO_MARKERS: WorldMarker[] = [];

const isTyping = (t: EventTarget | null) =>
    t instanceof HTMLElement &&
    (t.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));

interface Options {
    campaignId: string;
    mapId: string | null;
    initialSelectedId?: string;
}

export function useWorldEditorPage({
    campaignId,
    mapId,
    initialSelectedId,
}: Options) {
    const router = useRouter();

    const t = useTranslations('world');

    const pathname = usePathname();

    const maps = useWorldMaps(campaignId);

    const detail = useWorldMap(campaignId, mapId, { keepPrevious: true });

    const editor = useWorldEditor(campaignId, mapId);

    const roster = useWorldHeroes(campaignId);

    const eyes = useHeroEyes(campaignId, mapId);

    const [selectedId, select] = useState<string | null>(
        initialSelectedId ?? null
    );

    const [seenInitial, setSeenInitial] = useState(initialSelectedId);

    if (initialSelectedId !== seenInitial) {
        setSeenInitial(initialSelectedId);

        if (initialSelectedId) select(initialSelectedId);
    }

    const moveTarget = useMoveTarget(detail.data?.markers ?? NO_MARKERS);

    const [creating, setCreating] = useState(false);

    const [detailsOpen, setDetailsOpen] = useState(false);

    const [treeOpen, setTreeOpen] = useState<boolean | null>(null);

    const [mode, setModeState] = useState<WorldMode>('build');

    const [redrawId, setRedrawId] = useState<string | null>(null);

    const createMarker = async (data: Omit<CreateWorldMarkerData, 'mapId'>) => {
        if (!mapId) return;

        try {
            select(
                (await editor.marker.create.mutateAsync({ mapId, ...data })).id
            );
        } catch {
            // create's errorText already notified
        }
    };

    const { reset: resetTarget } = moveTarget;

    const drawing = useMapDrawing(
        {
            onPoint: (p) =>
                void createMarker({
                    kind: 'point',
                    x: p.x,
                    y: p.y,
                    name: t('defaults.point'),
                    icon: 'landmark',
                }),
            onZone: (polygon: Polygon) => {
                if (redrawId) {
                    void editor.marker.update.mutateOk({
                        id: redrawId,
                        data: { polygon },
                    });
                    setRedrawId(null);
                    drawing.setTool('select');

                    return;
                }

                const c = polygonCentroid(polygon);

                void createMarker({
                    kind: 'zone',
                    x: c.x,
                    y: c.y,
                    polygon,
                    name: t('defaults.zone'),
                });
            },
            onEntry: (p: MapPoint) => {
                if (mapId)
                    void editor.map.update.mutateOk({
                        id: mapId,
                        data: { entryX: p.x, entryY: p.y },
                    });
            },
            onMove: (p) => {
                if (!detail.isPlaceholderData) moveTarget.pickPoint(p);
            },
        },
        !eyes.asHeroId,
        MODE_TOOLS[mode]
    );

    const { tool, setTool } = drawing;

    useRemoveMarker({
        marker: detail.data?.markers.find((m) => m.id === selectedId),
        editor,
        select,
        hotkey: tool === 'select',
    });

    const [snapEnabled, setSnapEnabled] = useState(true);

    const snapZones = useMemo(
        () =>
            (detail.data?.markers ?? NO_MARKERS).flatMap((m) =>
                m.kind === 'zone' && m.polygon && m.id !== redrawId
                    ? [m.polygon]
                    : []
            ),
        [detail.data?.markers, redrawId]
    );

    const changeVertices = useCallback(
        (id: string, polygon: Polygon) =>
            void editor.marker.update.mutateOk({ id, data: { polygon } }),
        [editor.marker.update]
    );

    const closePanel = useCallback(() => {
        select(null);
        setDetailsOpen(false);
    }, []);

    const draftLength = drawing.draft.length;

    const detailsVisible = tool === 'select' && !eyes.asHeroId && detailsOpen;

    const drawingActive =
        !eyes.asHeroId && (tool !== MODE_HOME_TOOL[mode] || draftLength > 0);

    const hasSelection = selectedId !== null;

    useEffect(() => {
        // capture phase + preventDefault so useMapDrawing skips presses consumed here
        const onKey = (e: KeyboardEvent) => {
            if (
                e.key !== 'Escape' ||
                e.defaultPrevented ||
                isTyping(e.target) ||
                (e.target instanceof Element &&
                    e.target.closest('[role=dialog]'))
            )
                return;

            if (detailsVisible) setDetailsOpen(false);
            else if (drawingActive || !hasSelection) return;
            else select(null);

            e.preventDefault();

            if (document.activeElement instanceof HTMLElement)
                document.activeElement.blur();
        };

        window.addEventListener('keydown', onKey, true);

        return () => window.removeEventListener('keydown', onKey, true);
    }, [detailsVisible, drawingActive, hasSelection]);

    const setMode = useCallback(
        (next: WorldMode) => {
            setModeState(next);
            setRedrawId(null);
            setTool(MODE_HOME_TOOL[next]);
            closePanel();
        },
        [setTool, closePanel]
    );

    const redraw = useCallback(
        (id: string | null) => {
            setRedrawId(id);
            setTool(id ? 'zone' : 'select');
        },
        [setTool]
    );

    const openMap = useCallback(
        (
            id: string | null,
            { keepTool = false }: { keepTool?: boolean } = {}
        ) => {
            closePanel();
            setRedrawId(null);
            resetTarget();

            if (!keepTool) setTool(MODE_HOME_TOOL[mode]);

            router.replace(id ? `${pathname}?map=${id}` : pathname);
        },
        [router, pathname, setTool, resetTarget, closePanel, mode]
    );

    const changeEyes = (heroId: string | null) => {
        eyes.setAsHeroId(heroId);
        closePanel();
        setTool(MODE_HOME_TOOL[mode]);
    };

    const ctx: WorldEditorCtx = useMemo(
        () => ({
            campaignId,
            detail: detail.data ?? null,
            maps: maps.data ?? [],
            editor,
            selectedId,
            select,
            openMap,
            tool,
            setTool,
            redrawId,
            redraw,
        }),
        [
            campaignId,
            detail.data,
            maps.data,
            editor,
            selectedId,
            openMap,
            tool,
            setTool,
            redrawId,
            redraw,
        ]
    );

    return {
        ctx,
        data: { maps, detail, roster },
        tools: {
            eyes,
            drawing,
            moveTarget,
            editor,
            mode: { value: mode, set: setMode },
            snap: {
                zones: snapZones,
                enabled: snapEnabled,
                setEnabled: setSnapEnabled,
            },
        },
        selected: { id: selectedId, select, close: closePanel },
        dialogs: {
            create: { open: creating, set: setCreating },
            details: { open: detailsOpen, set: setDetailsOpen },
            tree: { open: treeOpen, set: setTreeOpen },
        },
        actions: { openMap, changeEyes, changeVertices },
    };
}
