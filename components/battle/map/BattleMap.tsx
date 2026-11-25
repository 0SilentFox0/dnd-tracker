'use client';

import { useCallback, useMemo, useRef } from 'react';

import { MapCameraControls } from './camera/MapCameraControls';
import { MapMinimap } from './camera/MapMinimap';
import { useBattleMapCamera } from './camera/useBattleMapCamera';
import { MapTransformLayers } from './layers/MapTransformLayers';
import { ATTACK_CURSOR } from './tokens/attack-cursors';
import { WeatherLayer } from './weather/WeatherLayer';
import type {
    BattleMapEditing,
    BattleMapLook,
    BattleMapProps,
} from './battle-map-types';
import { MapStage } from './MapStage';
import { useBattleMapFrame } from './useBattleMapFrame';

import './battle-map.css';
import { modeUiOf } from '@/components/battle/modes';
import {
    useGridWindow,
    useRevealListener,
    useScrollToCurrent,
    useStrokePaint,
} from '@/lib/hooks/battle';
import { useElementSize } from '@/lib/hooks/common';
import { cn } from '@/lib/utils';
import {
    cellPointPx,
    followTarget,
    minimapViewport,
} from '@/lib/utils/battle/camera';
import { gridOf, mapSize } from '@/lib/utils/battle/grid';
import type {
    BattleMapActions,
    BattleMapView,
    GridPoint,
} from '@/types/battle-grid';

export type { BattleMapActions, BattleMapView };
export type { BattleMapEditing, BattleMapLook, BattleMapProps };

const NO_EDITING: BattleMapEditing = {};

const NO_LOOK: BattleMapLook = {};

const ZOOM_STEP = 1.2;

export function BattleMap({
    map,
    participants,
    view,
    actions,
    look = NO_LOOK,
    editing = NO_EDITING,
    phone = false,
}: BattleMapProps) {
    const { tiles, className } = look;

    const { clickableBlocked, showBlocked, strokeTool, showDefaultBackground } =
        editing;

    const edges = editing.edges ?? null;

    const doors = editing.doors ?? null;

    const { doorLocks } = editing;

    const terrainPainting = Boolean(strokeTool && actions?.onStroke);

    const fogPainting = Boolean(
        editing.fog?.active &&
            (editing.fog.brush === 'brush' || editing.fog.brush === 'erase')
    );

    const painting = terrainPainting || fogPainting;

    const drawing = painting || edges !== null || !!editing.fog?.active;

    const modeTools = editing.mode ?? null;

    const ui = modeUiOf(map);

    const { cols, rows } = map;

    const grid = gridOf(map);

    const size = useMemo(
        () => mapSize({ cols, rows }, grid),
        [cols, rows, grid]
    );

    const { ref: outerRef, size: avail } = useElementSize<HTMLDivElement>({
        contentBox: true,
    });

    const onPaintStroke = useCallback(
        (cells: GridPoint[]) => {
            if (fogPainting) editing.fog?.onStroke(cells);
            else actions?.onStroke?.(cells);
        },
        [fogPainting, editing.fog, actions]
    );

    const { svgRef, preview, onStrokeStart } = useStrokePaint({
        painting,
        dims: { cols, rows },
        grid,
        onStroke: onPaintStroke,
    });

    const {
        win,
        fit,
        fitAll,
        renderedFit,
        cameraMode,
        scrollsX,
        scrollsY,
        scrolls,
        pxPerUnit,
        frame,
    } = useBattleMapFrame(map, avail, phone, grid);

    const containerRef = useRef<HTMLDivElement>(null);

    const { camera, cameraTarget, selfTarget } = useBattleMapCamera({
        frame,
        cameraMode,
        scrolls,
        drawing,
        modeTools,
        containerRef,
        view,
        participants,
        win,
        pxPerUnit,
        grid,
    });

    const { zoom, x, y } = camera.camera;

    const offset = useMemo(() => ({ x, y }), [x, y]);

    const { bind, wasDragged } = camera;

    const modeView = view?.mode;

    const trajectory = view?.trajectory ?? null;

    useScrollToCurrent(
        outerRef,
        containerRef,
        view?.currentId ?? null,
        scrolls && !cameraMode && (view?.camera?.follow ?? true)
    );

    const { focusPoint } = camera;

    const reveal = useCallback(
        (id: string) => {
            if (cameraMode) {
                const t = followTarget(id, participants, grid);

                if (t)
                    focusPoint(
                        cellPointPx(t.anchor, t.size, win, pxPerUnit, grid),
                        {
                            animate: true,
                        }
                    );

                return;
            }

            const outer = outerRef.current;

            const token = containerRef.current?.querySelector(
                `[data-fx-participant="${id}"][data-fx-anchor="map"]`
            );

            if (!outer || !token) return;

            const t = token.getBoundingClientRect();

            const o = outer.getBoundingClientRect();

            outer.scrollBy({
                left: t.left + t.width / 2 - (o.left + o.width / 2),
                top: t.top + t.height / 2 - (o.top + o.height / 2),
                behavior: 'smooth',
            });
        },
        [cameraMode, participants, focusPoint, win, pxPerUnit, outerRef, grid]
    );

    useRevealListener(reveal);

    const gridWindow = useGridWindow({
        svgRef,
        viewportRef: cameraMode ? containerRef : outerRef,
        deps: { zoom, offset, size, pxPerUnit, cells: { cols, rows }, grid },
    });

    const layout = useMemo(
        () => ({
            win,
            size,
            pxPerUnit,
            rotated: cameraMode ? false : fit.rotated,
            phone,
            window: gridWindow,
            tiles,
        }),
        [
            win,
            size,
            pxPerUnit,
            cameraMode,
            fit.rotated,
            phone,
            gridWindow,
            tiles,
        ]
    );

    const interaction = useMemo(
        () => ({ painting, preview, svgRef, onStrokeStart, wasDragged }),
        [painting, preview, svgRef, onStrokeStart, wasDragged]
    );

    const stageEditing = useMemo(
        () => ({
            clickableBlocked,
            showBlocked,
            mode: modeTools,
            edges,
            doors,
            doorLocks,
            showDefaultBackground,
            fogActive: !!editing.fog?.active,
            fog: editing.fog,
        }),
        [
            clickableBlocked,
            showBlocked,
            modeTools,
            edges,
            doors,
            doorLocks,
            showDefaultBackground,
            editing.fog,
        ]
    );

    // swipe goes to the browser for scrolling only; zoom, pinch and terrain strokes are ours
    const touch =
        !cameraMode && scrolls && zoom === 1 && !drawing
            ? cn(scrollsX && 'touch-pan-x', scrollsY && 'touch-pan-y')
            : 'touch-none';

    return (
        // a map larger than the screen scrolls; centring would clip its edge; scrollbar gutter reserved so the width doesn't jump
        <div
            ref={outerRef}
            className={cn(
                'flex h-full w-full',
                'relative',
                !cameraMode && (phone || scrolls) && 'overflow-auto',
                !cameraMode && phone && '[scrollbar-gutter:stable]',
                cameraMode
                    ? 'items-center justify-center'
                    : scrollsX
                      ? 'justify-start'
                      : 'justify-center',
                cameraMode ? '' : scrollsY ? 'items-start' : 'items-center',
                className
            )}
        >
            <div
                ref={containerRef}
                data-fx-clip
                data-attack-cursor={trajectory?.kind}
                className={cn(
                    'relative shrink-0 overflow-hidden bg-black select-none',
                    touch,
                    !phone && 'rounded-xl border border-white/10',
                    // the weapon cursor must beat the inline cursor: pointer on cells and tokens
                    trajectory &&
                        'cursor-(--attack-cursor)! **:cursor-(--attack-cursor)!'
                )}
                style={{
                    width: cameraMode ? avail.width : fit.width,
                    height: cameraMode ? avail.height : fit.height,
                    ...(trajectory && {
                        '--attack-cursor': ATTACK_CURSOR[trajectory.kind],
                    }),
                }}
                {...bind}
            >
                <MapTransformLayers
                    cameraMode={cameraMode}
                    fitAll={fitAll}
                    renderedFit={renderedFit}
                    offset={offset}
                    zoom={zoom}
                >
                    <MapStage
                        map={map}
                        participants={participants}
                        view={view}
                        actions={actions}
                        editing={stageEditing}
                        layout={layout}
                        interaction={interaction}
                    />
                </MapTransformLayers>
                {ui?.MapOverlay && (
                    <ui.MapOverlay
                        view={modeView ?? null}
                        participants={participants}
                    />
                )}
                <WeatherLayer weather={map.weather} phone={phone} />
            </div>
            {frame && (
                <MapCameraControls
                    onZoomIn={() => camera.zoomBy(ZOOM_STEP)}
                    onZoomOut={() => camera.zoomBy(1 / ZOOM_STEP)}
                    onRecenter={camera.recenter}
                    zoom={zoom}
                    canRecenter={
                        cameraMode ? !!selfTarget || !!cameraTarget : zoom > 1
                    }
                    userMoved={cameraMode ? camera.userMoved : zoom > 1}
                    phone={phone}
                />
            )}
            {cameraMode && frame && (
                <MapMinimap
                    map={map}
                    win={win}
                    participants={participants}
                    viewport={minimapViewport(camera.camera, frame)}
                    onPick={camera.flyToMinimap}
                    hiddenCells={[]}
                    phone={phone}
                />
            )}
        </div>
    );
}
