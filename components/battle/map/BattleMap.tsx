'use client';

import { useCallback, useMemo, useRef } from 'react';

import { MapCameraControls } from './camera/MapCameraControls';
import { MapMinimap } from './camera/MapMinimap';
import type { TileRenderState } from './tiles/TileCanvas';
import { WeatherLayer } from './weather/WeatherLayer';
import { ATTACK_CURSOR } from './attack-cursors';
import { MapStage } from './MapStage';

import './battle-map.css';
import { modeUiOf } from '@/components/battle/modes';
import {
    type EdgeEditing,
    type MapDoorsTool,
    type ModeTools,
    useGridWindow,
    useMapCamera,
    useScrollToCurrent,
    useStrokePaint,
} from '@/lib/hooks/battle';
import { useElementSize } from '@/lib/hooks/common';
import { cn } from '@/lib/utils';
import {
    cameraBounds,
    cellPointPx,
    followTarget,
    type Frame,
    minimapViewport,
    needsCamera,
} from '@/lib/utils/battle/camera';
import {
    fitMapView,
    mapSize,
    MIN_TAP_CELL_PX,
    playableBounds,
    UNIT,
} from '@/lib/utils/battle/grid';
import type { BattleParticipant } from '@/types/battle';
import type {
    BattleMapActions,
    BattleMapConfig,
    BattleMapView,
} from '@/types/battle-grid';

export type { BattleMapActions, BattleMapView };

export interface BattleMapProps {
    map: BattleMapConfig;
    participants: BattleParticipant[];
    view?: BattleMapView;
    actions?: BattleMapActions;
    look?: BattleMapLook;
    editing?: BattleMapEditing;
    phone?: boolean;
}

export interface BattleMapLook {
    tiles?: TileRenderState;
    className?: string;
}

export interface BattleMapEditing {
    /** false: no fallback image when the map has no selected background */
    showDefaultBackground?: boolean;
    clickableBlocked?: boolean;
    showBlocked?: boolean;
    strokeTool?: boolean;
    edges?: EdgeEditing | null;
    doors?: MapDoorsTool | null;
    doorLocks?: boolean;
    mode?: ModeTools | null;
    fog?: {
        mode: 'off' | 'reveal' | 'vision';
        revealed: import('@/types/battle-grid').RevealedRun[];
        visible: ReadonlySet<string>;
        explored: ReadonlySet<string>;
        dmEditing: boolean;
        active: boolean;
        brush: import('@/lib/hooks/battle/useMapFogTool').FogBrush;
        onStroke(cells: import('@/types/battle-grid').GridPoint[]): void;
    };
}

const NO_EDITING: BattleMapEditing = {};

const NO_LOOK: BattleMapLook = {};

const FIT_ZOOM_BOUNDS = { min: 1, max: 3 };

const ZOOM_STEP = 1.2;

const DESKTOP_MAX_TALLER = 1.4;

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

    const size = useMemo(() => mapSize({ cols, rows }), [cols, rows]);

    const { ref: outerRef, size: avail } = useElementSize<HTMLDivElement>({
        contentBox: true,
    });

    const onPaintStroke = useCallback(
        (cells: import('@/types/battle-grid').GridPoint[]) => {
            if (fogPainting) editing.fog?.onStroke(cells);
            else actions?.onStroke?.(cells);
        },
        [fogPainting, editing.fog, actions]
    );

    const { svgRef, preview, onStrokeStart } = useStrokePaint({
        painting,
        dims: { cols, rows },
        onStroke: onPaintStroke,
    });

    const win = useMemo(
        () => (phone ? playableBounds(map) : { x: 0, y: 0, cols, rows }),
        [phone, map, cols, rows]
    );

    const fit = useMemo(
        () =>
            fitMapView(avail, win, {
                rotatable: phone,
                bothWays: !phone,
                fillWidth: phone,
                taller: phone ? 1 : DESKTOP_MAX_TALLER,
                minCell: MIN_TAP_CELL_PX,
            }),
        [avail, win, phone]
    );

    const cameraMode = needsCamera(fit);

    const fitAll = useMemo(
        () =>
            cameraMode
                ? fitMapView(avail, win, {
                      rotatable: false,
                      bothWays: false,
                      fillWidth: false,
                      taller: 1,
                  })
                : fit,
        [cameraMode, avail, win, fit]
    );

    const renderedFit = cameraMode ? fitAll : fit;

    const scrollsX = fit.width > avail.width + 0.5;

    const scrollsY = fit.height > avail.height + 0.5;

    const scrolls = scrollsX || scrollsY;

    const containerRef = useRef<HTMLDivElement>(null);

    const pxPerUnit = renderedFit.width / (win.cols * UNIT);

    const frame = useMemo<Frame | null>(() => {
        if (avail.width <= 0 || avail.height <= 0) return null;

        if (!cameraMode)
            return {
                avail: { width: fit.width, height: fit.height },
                content: { width: fit.width, height: fit.height },
                bounds: FIT_ZOOM_BOUNDS,
            };

        return {
            avail,
            content: { width: fitAll.width, height: fitAll.height },
            bounds: cameraBounds(fitAll.width / win.cols),
        };
    }, [cameraMode, avail, fit.width, fit.height, fitAll.width, fitAll.height, win.cols]);

    const cameraTarget = followTarget(view?.currentId ?? null, participants);

    const selfTarget = followTarget(view?.camera?.selfId ?? null, participants);

    const camera = useMapCamera({
        enabled: true,
        modeKey: cameraMode,
        frame,
        containerRef,
        panLocked: drawing || !!modeTools?.panLocked,
        wheelScrolls: !cameraMode && scrolls,
        follow: {
            currentId: view?.currentId ?? null,
            target: cameraMode && cameraTarget
                ? {
                      point: cellPointPx(
                          cameraTarget.anchor,
                          cameraTarget.size,
                          win,
                          pxPerUnit
                      ),
                  }
                : null,
            self: cameraMode && selfTarget
                ? {
                      point: cellPointPx(
                          selfTarget.anchor,
                          selfTarget.size,
                          win,
                          pxPerUnit
                      ),
                  }
                : null,
            enabled: cameraMode && (view?.camera?.follow ?? false),
        },
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

    const gridWindow = useGridWindow({
        svgRef,
        viewportRef: cameraMode ? containerRef : outerRef,
        deps: { zoom, offset, size, pxPerUnit },
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
        [win, size, pxPerUnit, cameraMode, fit.rotated, phone, gridWindow, tiles]
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
                <div
                    className={cn(
                        'origin-top-left',
                        cameraMode
                            ? 'absolute top-0 left-0'
                            : 'absolute inset-0'
                    )}
                    style={{
                        ...(cameraMode && {
                            width: fitAll.width,
                            height: fitAll.height,
                        }),
                        transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                    }}
                >
                    <div
                        data-map-rotated={renderedFit.rotated || undefined}
                        className={cn(
                            'absolute top-0 left-0 origin-top-left',
                            !renderedFit.rotated && 'inset-0'
                        )}
                        style={
                            renderedFit.rotated
                                ? {
                                      width: renderedFit.height,
                                      height: renderedFit.width,
                                      transform: `translateX(${renderedFit.width}px) rotate(90deg)`,
                                  }
                                : undefined
                        }
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
                    </div>
                </div>
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
