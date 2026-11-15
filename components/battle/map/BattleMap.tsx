'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { MapCameraControls } from './camera/MapCameraControls';
import { MapMinimap } from './camera/MapMinimap';
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
import { useViewport } from '@/lib/hooks/common';
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
import type {
    BattleMapActions,
    BattleMapConfig,
    BattleMapView,
    BattleParticipant,
} from '@/types/battle';

export type { BattleMapActions, BattleMapView };

export interface BattleMapProps {
    map: BattleMapConfig;
    participants: BattleParticipant[];
    view?: BattleMapView;
    actions?: BattleMapActions;
    className?: string;
    editing?: BattleMapEditing;
    /** телефон: карта обрізана до ігрових клітинок, на всю ширину й вертикально, якщо вона альбомна */
    phone?: boolean;
}

export interface BattleMapEditing {
    clickableBlocked?: boolean;
    showBlocked?: boolean;
    strokeTool?: boolean;
    /** інструмент ребер: стіни й ґрати малюються штрихом по краях клітинок; null — вимкнений */
    edges?: EdgeEditing | null;
    /** двері: клік гравця відчиняє, меню ДМ; null/відсутній — лише гліфи */
    doors?: MapDoorsTool | null;
    /** показувати замки дверей (редактор, ДМ) */
    doorLocks?: boolean;
    /** інструменти ДМ активного режиму; null — жоден не активний */
    mode?: ModeTools | null;
}

const NO_EDITING: BattleMapEditing = {};

// на десктопі карта може бути вищою за область (до цього множника), щоб розтягнутись по ширині; зайве прокручується
const DESKTOP_MAX_TALLER = 1.4;

export function BattleMap({
    map,
    participants,
    view,
    actions,
    className,
    editing = NO_EDITING,
    phone = false,
}: BattleMapProps) {
    const { clickableBlocked, showBlocked, strokeTool } = editing;

    const edges = editing.edges ?? null;

    const doors = editing.doors ?? null;

    const { doorLocks } = editing;

    const painting = Boolean(strokeTool && actions?.onStroke);

    const drawing = painting || edges !== null;

    const modeTools = editing.mode ?? null;

    const ui = modeUiOf(map);

    const { cols, rows } = map;

    const size = useMemo(() => mapSize({ cols, rows }), [cols, rows]);

    const outerRef = useRef<HTMLDivElement>(null);

    const [avail, setAvail] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const el = outerRef.current;

        if (!el) return;

        const rect = el.getBoundingClientRect();

        setAvail({ width: rect.width, height: rect.height });

        const observer = new ResizeObserver(([entry]) =>
            setAvail({
                width: entry.contentRect.width,
                height: entry.contentRect.height,
            })
        );

        observer.observe(el);

        return () => observer.disconnect();
    }, []);

    const { svgRef, preview, onStrokeStart } = useStrokePaint({
        painting,
        dims: { cols, rows },
        onStroke: actions?.onStroke,
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

    const viewport = useViewport({
        panLocked: drawing || !!modeTools?.panLocked,
        wheelScrolls: scrolls,
        enabled: !cameraMode,
        containerRef,
    });

    const pxPerUnit = renderedFit.width / (win.cols * UNIT);

    const frame = useMemo<Frame | null>(() => {
        if (!cameraMode || avail.width <= 0 || avail.height <= 0) return null;

        return {
            avail,
            content: { width: fitAll.width, height: fitAll.height },
            bounds: cameraBounds(fitAll.width / win.cols),
        };
    }, [cameraMode, avail, fitAll.width, fitAll.height, win.cols]);

    const cameraTarget = followTarget(view?.currentId ?? null, participants);

    const selfTarget = followTarget(view?.camera?.selfId ?? null, participants);

    const camera = useMapCamera({
        enabled: cameraMode,
        frame,
        containerRef,
        panLocked: drawing || !!modeTools?.panLocked,
        follow: {
            currentId: view?.currentId ?? null,
            target: cameraTarget
                ? { point: cellPointPx(cameraTarget.anchor, cameraTarget.size, win, pxPerUnit) }
                : null,
            self: selfTarget
                ? { point: cellPointPx(selfTarget.anchor, selfTarget.size, win, pxPerUnit) }
                : null,
            enabled: view?.camera?.follow ?? false,
        },
    });

    const zoom = cameraMode ? camera.camera.zoom : viewport.zoom;

    const offset = cameraMode
        ? { x: camera.camera.x, y: camera.camera.y }
        : viewport.offset;

    const bind = cameraMode ? camera.bind : viewport.bind;

    const wasDragged = cameraMode ? camera.wasDragged : viewport.wasDragged;

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
        }),
        [win, size, pxPerUnit, cameraMode, fit.rotated, phone, gridWindow]
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
        }),
        [clickableBlocked, showBlocked, modeTools, edges, doors, doorLocks]
    );

    // свайп віддаємо браузеру лише для прокрутки; зум, щипок і штрих місцевості — наші
    const touch =
        !cameraMode && scrolls && zoom === 1 && !drawing
            ? cn(scrollsX && 'touch-pan-x', scrollsY && 'touch-pan-y')
            : 'touch-none';

    return (
        // карта, більша за екран, прокручується; по центру вона обрізала б край без прокрутки; смуга прокрутки з резервом, щоб ширина не стрибала
        <div
            ref={outerRef}
            className={cn(
                'flex h-full w-full',
                cameraMode && 'relative',
                !cameraMode && (phone || scrolls) && 'overflow-auto',
                !cameraMode && phone && '[scrollbar-gutter:stable]',
                cameraMode
                    ? 'items-center justify-center'
                    : scrollsX
                      ? 'justify-start'
                      : 'justify-center',
                cameraMode
                    ? ''
                    : scrollsY
                      ? 'items-start'
                      : 'items-center',
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
                    // курсор-зброя має перебити інлайн cursor: pointer на клітинках і токенах
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
                        cameraMode ? 'absolute top-0 left-0' : 'absolute inset-0'
                    )}
                    style={{
                        ...(cameraMode && {
                            width: fitAll.width,
                            height: fitAll.height,
                        }),
                        transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                    }}
                >
                    {/* поворот усередині шару зуму, тож панорама й щипок лишаються в екранних координатах */}
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
            {cameraMode && frame && (
                <>
                    <MapCameraControls
                        onZoomIn={() => camera.zoomBy(1.2)}
                        onZoomOut={() => camera.zoomBy(1 / 1.2)}
                        onRecenter={camera.recenter}
                        canRecenter={!!selfTarget || !!cameraTarget}
                        userMoved={camera.userMoved}
                        phone={phone}
                    />
                    <MapMinimap
                        map={map}
                        win={win}
                        participants={participants}
                        viewport={minimapViewport(camera.camera, frame)}
                        onPick={camera.flyToMinimap}
                        hiddenCells={[]}
                        phone={phone}
                    />
                </>
            )}
        </div>
    );
}
