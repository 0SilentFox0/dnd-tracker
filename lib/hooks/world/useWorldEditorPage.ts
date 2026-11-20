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

import { markerAnchor, polygonCentroid } from '@/lib/utils/world/geometry';
import { isTyping } from '@/lib/utils/world/is-typing';
import { insertSharedPoints } from '@/lib/utils/world/zone-snap';
import type {
    CreateWorldMarkerData,
    MapPoint,
    Polygon,
    WorldMarker,
} from '@/types/world';

const NO_MARKERS: WorldMarker[] = [];

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

    const markers = detail.data?.markers ?? NO_MARKERS;

    const moveTarget = useMoveTarget(markers);

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

    const mapAspect = detail.data
        ? detail.data.map.height / detail.data.map.width
        : 1;

    const shareEdgePoints = useCallback(
        (selfId: string | null, ring: Polygon) => {
            const neighbours = markers.flatMap((m) =>
                m.kind === 'zone' && m.polygon && m.id !== selfId
                    ? [{ id: m.id, polygon: m.polygon }]
                    : []
            );

            for (const n of insertSharedPoints(ring, neighbours, mapAspect))
                void editor.marker.update.mutateOk({
                    id: n.id,
                    data: { polygon: n.polygon },
                });
        },
        [markers, mapAspect, editor.marker.update]
    );

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
                shareEdgePoints(redrawId, polygon);

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
        marker: markers.find((m) => m.id === selectedId),
        editor,
        select,
        hotkey: tool === 'select',
    });

    const [snapEnabled, setSnapEnabled] = useState(true);

    const snapZones = useMemo(
        () =>
            markers.flatMap((m) =>
                m.kind === 'zone' && m.polygon && m.id !== redrawId
                    ? [m.polygon]
                    : []
            ),
        [markers, redrawId]
    );

    const changeVertices = useCallback(
        (id: string, polygon: Polygon) => {
            void editor.marker.update.mutateOk({ id, data: { polygon } });
            shareEdgePoints(id, polygon);
        },
        [editor.marker.update, shareEdgePoints]
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

    const handlers = {
        ...drawing.handlers,
        onVertexChange: changeVertices,
        onMapClick: (p: MapPoint) =>
            tool === 'select' ? select(null) : drawing.handlers.onMapClick(p),
        onMarkerClick: (id: string) => {
            if (tool === 'select') select(id);
            else if (tool === 'move' && !detail.isPlaceholderData)
                moveTarget.pickMarker(id);
        },
        onMarkerDoubleClick: (id: string) => {
            const child = markers.find((m) => m.id === id)?.childMapId;

            if (child) openMap(child);
        },
        onMarkerDrag:
            tool === 'select' || tool === 'point'
                ? (id: string, p: MapPoint) =>
                      void editor.marker.update.mutateOk({
                          id,
                          data: { x: p.x, y: p.y },
                      })
                : undefined,
    };

    const selectedMarker = selectedId
        ? markers.find((m) => m.id === selectedId)
        : undefined;

    const bubbleOpen =
        tool === 'select' &&
        !eyes.asHeroId &&
        !!selectedMarker &&
        !detailsOpen;

    const card = {
        marker: selectedMarker,
        open: bubbleOpen,
        point: selectedMarker ? markerAnchor(selectedMarker) : null,
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
        actions: { openMap, changeEyes },
        handlers,
        card,
    };
}
