'use client';

import {
    type PointerEvent,
    type ReactNode,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Maximize, Minimize, Minus, Plus, RotateCcw } from 'lucide-react';

import { LayerImageRect } from './LayerImageRect';
import { WorldEnemies } from './WorldEnemies';
import { WorldFog } from './WorldFog';
import { WorldHeroes } from './WorldHeroes';
import { WorldLayerImages } from './WorldLayerImages';
import { WorldPins } from './WorldPins';
import { WorldTrails, type WorldTrailsProps } from './WorldTrails';
import { WorldZones } from './WorldZones';
import { ZoneVertexHandles } from './ZoneVertexHandles';

import '../world-atlas.css';
import { Button } from '@/components/ui/button';
import {
    NO_LAYER_KEY,
    WORLD_MAX_ZOOM,
    WORLD_SNAP_PX,
} from '@/lib/constants/world';
import {
    useElementSize,
    useReducedMotion,
    useViewport,
} from '@/lib/hooks/common';
import { useMarkerBubblePosition, type WorldTool } from '@/lib/hooks/world';
import { cn } from '@/lib/utils';
import { toMediaUrl } from '@/lib/utils/common/image-url';
import { fitBox, toMapPoint } from '@/lib/utils/world/geometry';
import { hintPosition } from '@/lib/utils/world/hint-position';
import { applyLayerStyle } from '@/lib/utils/world/marker-style';
import { snapPoint } from '@/lib/utils/world/zone-snap';
import type {
    LayerRect,
    MapFocus,
    MapPoint,
    Polygon,
    RevealShape,
    WorldEnemyPin,
    WorldHero,
    WorldMapDetail,
    WorldViewLayer,
} from '@/types/world';

const ZOOM_STEP = 1.5;

const MAX_SIZES_ZOOM = 2;

const FOCUS_ZOOM = 3;

const KEY_PAN = {
    ArrowLeft: [56, 0],
    ArrowRight: [-56, 0],
    ArrowUp: [0, 56],
    ArrowDown: [0, -56],
} as const;

export interface WorldMapViewProps {
    detail: WorldMapDetail;
    selectedId?: string | null;
    edit?: {
        tool?: WorldTool;
        draft?: MapPoint[];
        snap?: { zones: Polygon[]; enabled: boolean };
    };
    handlers?: {
        onMapClick?(p: MapPoint): void;
        onMapDoubleClick?(p: MapPoint): void;
        onMarkerClick?(id: string): void;
        onMarkerDoubleClick?(id: string): void;
        onMarkerDrag?(id: string, p: MapPoint): void;
        onHeroClick?(id: string): void;
        onEnemyClick?(id: string): void;
        onEnemyDrag?(id: string, p: MapPoint): void;
        onVertexChange?(markerId: string, polygon: Polygon): void;
    };
    layers?: {
        items: WorldViewLayer[];
        hidden: ReadonlySet<string>;
        edit?: {
            layerId: string | null;
            onRectChange(layerId: string, rect: LayerRect): void;
        };
    };
    fog?: { shapes: RevealShape[]; radius: number };
    heroes?: WorldHero[];
    enemies?: WorldEnemyPin[];
    dragHeroes?: {
        onDrop(ids: string[], to: MapPoint): void;
        selected: string[];
    };
    trails?: Omit<WorldTrailsProps, 'zoom'>;
    focus?: MapFocus;
    slots?: {
        overlay?: ReactNode;
        mode?: 'party' | 'own';
        card?: { point: MapPoint; content: ReactNode };
        hint?: ReactNode;
        fullscreen?: { full: boolean; toggle(): void };
    };
    compact?: boolean;
    className?: string;
}

const zoneIdAt = (target: EventTarget | null, tool: WorldTool) =>
    (tool === 'select' || tool === 'move') && target instanceof Element
        ? target.closest<SVGElement>('[data-zone-id]')?.dataset.zoneId
        : undefined;

const CARD_FALLBACK_SIZE = { width: 208, height: 64 };

function CardSlot({
    card,
    box,
    crop,
    zoom,
    offset,
}: {
    card: { point: MapPoint; content: ReactNode };
    box: { width: number; height: number };
    crop?: { x: number; y: number };
    zoom: number;
    offset: { x: number; y: number };
}) {
    const { ref, size } = useElementSize<HTMLDivElement>();

    const pos = useMarkerBubblePosition({
        point: card.point,
        box,
        crop,
        zoom,
        offset,
        size: size.width > 0 ? size : CARD_FALLBACK_SIZE,
    });

    return (
        <div
            ref={ref}
            data-testid="world-map-card"
            data-placement={pos.placement}
            className="absolute z-20 w-max max-w-[calc(100%-1rem)]"
            style={{ left: pos.left, top: pos.top }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
        >
            {card.content}
        </div>
    );
}

interface HintPointer {
    x: number;
    y: number;
    width: number;
    height: number;
}

function CursorHint({
    pointer,
    children,
}: {
    pointer: HintPointer;
    children: ReactNode;
}) {
    const { ref, size } = useElementSize<HTMLDivElement>();

    const pos = hintPosition(pointer, pointer, size);

    return (
        <div
            ref={ref}
            data-testid="world-map-hint"
            className="pointer-events-none absolute z-10"
            style={{ left: pos.left, top: pos.top }}
        >
            {children}
        </div>
    );
}

export function WorldMapView({
    detail,
    selectedId,
    edit,
    handlers = {},
    fog,
    layers,
    heroes,
    enemies,
    dragHeroes,
    trails,
    focus,
    slots,
    compact = false,
    className,
}: WorldMapViewProps) {
    const { map, markers } = detail;

    const { tool = 'select', draft, snap } = edit ?? {};

    const { overlay, card, hint, fullscreen, mode } = slots ?? {};

    const t = useTranslations('world.zoom');

    const { ref: outerRef, size } = useElementSize<HTMLDivElement>();

    const box = fitBox(size, map.width / map.height, !!mode);

    const crop = mode
        ? { x: Math.max(0, -box.left), y: Math.max(0, -box.top) }
        : undefined;

    const minZoom =
        mode && box.width > 0 && size.height > 0
            ? Math.min(1, size.width / box.width, size.height / box.height)
            : 1;

    const {
        zoom,
        offset,
        containerRef,
        wasDragged,
        bind,
        reset,
        zoomBy,
        panBy,
        focusOn,
        rescale,
    } = useViewport({ minZoom, maxZoom: WORLD_MAX_ZOOM, crop });

    const [dragging, setDragging] = useState<{
        id: string;
        point: MapPoint;
    } | null>(null);

    const pointAt = (clientX: number, clientY: number) =>
        toMapPoint(
            { x: clientX, y: clientY },
            containerRef.current?.getBoundingClientRect() ?? box,
            { zoom, offset }
        );

    const insideMapAt = (clientX: number, clientY: number) => {
        const r = containerRef.current?.getBoundingClientRect();

        if (!r) return null;

        const clip = mode
            ? outerRef.current?.getBoundingClientRect()
            : null;

        const left = clip ? Math.max(clip.left, r.left + offset.x) : r.left;

        const right = clip
            ? Math.min(clip.right, r.left + offset.x + r.width * zoom)
            : r.right;

        const top = clip ? Math.max(clip.top, r.top + offset.y) : r.top;

        const bottom = clip
            ? Math.min(clip.bottom, r.top + offset.y + r.height * zoom)
            : r.bottom;

        const inside =
            clientX >= left &&
            clientX <= right &&
            clientY >= top &&
            clientY <= bottom;

        return inside ? pointAt(clientX, clientY) : null;
    };

    const snappedAt = (
        clientX: number,
        clientY: number,
        alt: boolean,
        skip?: Polygon | null
    ) => {
        const p = pointAt(clientX, clientY);

        return snap?.enabled && !alt
            ? snapPoint(
                  p,
                  snap.zones.filter((z) => z !== skip),
                  WORLD_SNAP_PX / (box.width * zoom),
                  box.height / box.width
              )
            : p;
    };

    const [preview, setPreview] = useState<{
        id: string;
        polygon: Polygon;
    } | null>(null);

    const layerHidden = layers?.hidden;

    const styled = useMemo(
        () => applyLayerStyle(markers, layers?.items ?? []),
        [markers, layers?.items]
    );

    const visibleMarkers = layerHidden?.size
        ? styled.filter((m) => !layerHidden.has(m.layerId ?? NO_LAYER_KEY))
        : styled;

    const shownMarkers = preview
        ? visibleMarkers.map((m) =>
              m.id === preview.id ? { ...m, polygon: preview.polygon } : m
          )
        : visibleMarkers;

    const editingZone =
        tool === 'select' && handlers.onVertexChange
            ? shownMarkers.find(
                  (m) => m.id === selectedId && m.kind === 'zone' && m.polygon
              )
            : undefined;

    const editingLayer =
        tool === 'select' && layers?.edit?.layerId
            ? layers.items.find((l) => l.id === layers.edit?.layerId)
            : undefined;

    const [hoveredZone, setHoveredZone] = useState<string | null>(null);

    const [pointer, setPointer] = useState<HintPointer | null>(null);

    const [cursor, setCursor] = useState<MapPoint | null>(null);

    useEffect(() => {
        if (focus)
            focusOn(focus.point.x, focus.point.y, focus.zoom ?? FOCUS_ZOOM);
    }, [focus, focusOn]);

    const lastWidth = useRef(0);

    useLayoutEffect(() => {
        const prev = lastWidth.current;

        lastWidth.current = box.width;

        // keep the viewed area when the sheet resizes (side panel, fullscreen)
        if (prev > 0 && box.width > 0 && (box.width !== prev || mode))
            rescale(box.width / prev);
    }, [box.width, crop?.x, crop?.y, mode, rescale]);

    const sizes = `${Math.round(box.width * Math.min(zoom, MAX_SIZES_ZOOM))}px`;

    const layerStyle = {
        transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
        transformOrigin: '0 0',
    };

    const still = useReducedMotion();

    const pinGesture = useRef(false);

    const onBackgroundUp = (e: PointerEvent<HTMLElement>) => {
        bind.onPointerUp(e);

        // a pin gesture whose pointerup lands on the background must not act as a map click
        if (pinGesture.current) {
            pinGesture.current = false;

            return;
        }

        if (wasDragged() || (mode && !insideMapAt(e.clientX, e.clientY)))
            return;

        const zoneId = zoneIdAt(e.target, tool);

        if (zoneId) handlers.onMarkerClick?.(zoneId);
        else
            handlers.onMapClick?.(
                tool === 'zone'
                    ? snappedAt(e.clientX, e.clientY, e.altKey)
                    : pointAt(e.clientX, e.clientY)
            );
    };

    return (
        <div
            data-tool={tool}
            data-world-game={mode}
            data-still={still}
            role={mode ? 'region' : undefined}
            aria-label={mode ? map.name : undefined}
            tabIndex={mode ? 0 : undefined}
            onFocusCapture={(e) => {
                if (
                    !mode ||
                    !(e.target instanceof HTMLElement) ||
                    !e.target.matches(
                        '.atlas-pin:focus-visible, .atlas-hero:focus-visible'
                    )
                )
                    return;

                const marker = e.target.getBoundingClientRect();

                const stage = e.currentTarget.getBoundingClientRect();

                if (
                    marker.left >= stage.left &&
                    marker.right <= stage.right &&
                    marker.top >= stage.top &&
                    marker.bottom <= stage.bottom
                )
                    return;

                const point = pointAt(
                    marker.left + marker.width / 2,
                    marker.top + marker.height / 2
                );

                focusOn(point.x, point.y, zoom);
            }}
            onKeyDown={(e) => {
                if (
                    !mode ||
                    e.target !== e.currentTarget ||
                    !Object.hasOwn(KEY_PAN, e.key)
                )
                    return;

                e.preventDefault();

                const [dx, dy] = KEY_PAN[e.key as keyof typeof KEY_PAN];

                panBy(dx, dy);
            }}
            className={cn(
                'atlas-map relative h-full w-full overflow-hidden rounded-xl border border-hud-rule',
                mode ? 'min-h-0' : 'min-h-[16rem]',
                className
            )}
            onPointerMove={(e) => {
                if (!hint) return;

                if (e.pointerType === 'touch') {
                    if (pointer) setPointer(null);

                    return;
                }

                const r = e.currentTarget.getBoundingClientRect();

                setPointer({
                    x: e.clientX - r.left,
                    y: e.clientY - r.top,
                    width: r.width,
                    height: r.height,
                });
            }}
            onPointerLeave={() => setPointer(null)}
        >
            {size.width > 0 ? (
                <Image
                    src={toMediaUrl(map.imageUrl)}
                    alt=""
                    aria-hidden
                    fill
                    sizes={sizes}
                    draggable={false}
                    className="atlas-backdrop pointer-events-none object-cover select-none"
                />
            ) : null}
            <div ref={outerRef} className="absolute inset-0">
                {/* container is always mounted so useViewport can attach its wheel listener on the first commit */}
                <div
                    ref={containerRef}
                    data-testid="world-map-box"
                    className="atlas-sheet absolute overflow-hidden"
                    style={{
                        left: box.left,
                        top: box.top,
                        width: box.width,
                        height: box.height,
                        touchAction: 'none',
                    }}
                    onPointerDown={(e) => {
                        pinGesture.current = false;
                        bind.onPointerDown(e);
                    }}
                    onPointerMove={(e) => {
                        bind.onPointerMove(e);

                        const over = zoneIdAt(e.target, tool) ?? null;

                        if (over !== hoveredZone) setHoveredZone(over);

                        if (tool === 'zone' && draft?.length)
                            setCursor(
                                snappedAt(e.clientX, e.clientY, e.altKey)
                            );
                    }}
                    onPointerUp={onBackgroundUp}
                    onPointerCancel={bind.onPointerCancel}
                    onPointerLeave={() => setHoveredZone(null)}
                    onDoubleClick={(e) => {
                        if (mode && !insideMapAt(e.clientX, e.clientY))
                            return;

                        const zoneId = zoneIdAt(e.target, tool);

                        if (zoneId) handlers.onMarkerDoubleClick?.(zoneId);
                        else
                            handlers.onMapDoubleClick?.(
                                tool === 'zone'
                                    ? snappedAt(e.clientX, e.clientY, e.altKey)
                                    : pointAt(e.clientX, e.clientY)
                            );
                    }}
                >
                    {size.width > 0 ? (
                        <div className="absolute inset-0" style={layerStyle}>
                            <Image
                                src={toMediaUrl(map.imageUrl)}
                                alt={map.name}
                                fill
                                draggable={false}
                                sizes={sizes}
                                className="pointer-events-none object-fill select-none"
                            />
                            {layers ? (
                                <WorldLayerImages
                                    layers={layers.items}
                                    hidden={layers.hidden}
                                    width={Math.round(
                                        box.width *
                                            Math.min(zoom, MAX_SIZES_ZOOM)
                                    )}
                                />
                            ) : null}
                            <WorldZones
                                markers={shownMarkers}
                                selectedId={selectedId}
                                draft={draft}
                                cursor={tool === 'zone' ? cursor : null}
                                showEdges={tool === 'zone'}
                                interactive={
                                    tool === 'select' || tool === 'move'
                                }
                            />
                            {editingZone?.polygon && handlers.onVertexChange ? (
                                <ZoneVertexHandles
                                    markerId={editingZone.id}
                                    polygon={editingZone.polygon}
                                    zoom={zoom}
                                    pointAt={(x, y, alt) =>
                                        snappedAt(
                                            x,
                                            y,
                                            alt,
                                            markers.find(
                                                (m) => m.id === editingZone.id
                                            )?.polygon
                                        )
                                    }
                                    onPreview={(polygon) =>
                                        setPreview(
                                            polygon
                                                ? {
                                                      id: editingZone.id,
                                                      polygon,
                                                  }
                                                : null
                                        )
                                    }
                                    onChange={handlers.onVertexChange}
                                />
                            ) : null}
                            {draft?.map((p, i) => (
                                <span
                                    key={i}
                                    className="atlas-draft-dot"
                                    data-closable={i === 0 && draft.length >= 3}
                                    style={{
                                        left: `${p.x * 100}%`,
                                        top: `${p.y * 100}%`,
                                        transform: `translate(-50%, -50%) scale(${1 / zoom})`,
                                    }}
                                />
                            ))}
                        </div>
                    ) : null}
                    {fog && size.width > 0 ? (
                        <WorldFog
                            shapes={fog.shapes}
                            radius={fog.radius}
                            box={box}
                            crop={crop}
                            zoom={zoom}
                            offset={offset}
                            still={still}
                        />
                    ) : null}
                    {size.width > 0 ? (
                        <div
                            className="atlas-top-layer absolute inset-0"
                            style={layerStyle}
                        >
                            {editingLayer && layers?.edit ? (
                                <LayerImageRect
                                    key={editingLayer.id}
                                    layer={editingLayer}
                                    zoom={zoom}
                                    toPoint={pointAt}
                                    onChange={layers.edit.onRectChange}
                                />
                            ) : null}
                            {trails ? (
                                <WorldTrails
                                    {...trails}
                                    zoom={zoom}
                                    interactive={
                                        tool === 'select' || tool === 'move'
                                    }
                                />
                            ) : null}
                            <div
                                className="contents"
                                onPointerDownCapture={() =>
                                    (pinGesture.current = true)
                                }
                                onPointerUpCapture={() =>
                                    (pinGesture.current = false)
                                }
                            >
                                <WorldPins
                                    markers={visibleMarkers}
                                    zoom={zoom}
                                    screen={{
                                        box: {
                                            width: box.width,
                                            height: box.height,
                                        },
                                        compact,
                                        touchTargets: !!mode && compact,
                                        cluster:
                                            tool !== 'point' &&
                                            tool !== 'entry',
                                    }}
                                    labels={{
                                        hoveredId: hoveredZone,
                                        fogless: !fog,
                                    }}
                                    selectedId={selectedId}
                                    drag={{
                                        current: dragging,
                                        onMove: (id, x, y) =>
                                            setDragging({
                                                id,
                                                point: pointAt(x, y),
                                            }),
                                        onEnd: (id, x, y) => {
                                            setDragging(null);
                                            handlers.onMarkerDrag?.(
                                                id,
                                                pointAt(x, y)
                                            );
                                        },
                                        onCancel: () => setDragging(null),
                                    }}
                                    handlers={{
                                        ...handlers,
                                        onClusterZoom: (p, z) =>
                                            focusOn(p.x, p.y, z),
                                    }}
                                />
                                {enemies ? (
                                    <WorldEnemies
                                        enemies={enemies}
                                        zoom={zoom}
                                        selectedId={selectedId}
                                        toPoint={insideMapAt}
                                        handlers={handlers}
                                    />
                                ) : null}
                            </div>
                            {heroes?.length ? (
                                <WorldHeroes
                                    heroes={heroes}
                                    party={mode}
                                    touchTargets={!!mode && compact}
                                    zoom={zoom}
                                    box={box}
                                    onHeroClick={handlers.onHeroClick}
                                    drag={
                                        dragHeroes
                                            ? {
                                                  ...dragHeroes,
                                                  toPoint: insideMapAt,
                                              }
                                            : undefined
                                    }
                                />
                            ) : null}
                            {overlay}
                        </div>
                    ) : null}
                    {card && size.width > 0 ? (
                        <CardSlot
                            card={card}
                            box={box}
                            crop={crop}
                            zoom={zoom}
                            offset={offset}
                        />
                    ) : null}
                </div>
            </div>
            {hint && pointer ? (
                <CursorHint pointer={pointer}>{hint}</CursorHint>
            ) : null}
            <div
                data-tour="world.zoom"
                className={cn(
                    'absolute right-2 z-10 flex flex-col gap-1',
                    mode
                        ? 'world-zoom-controls world-glass bottom-28 lg:bottom-3'
                        : 'bottom-14 max-lg:opacity-60 max-lg:focus-within:opacity-100 max-lg:active:opacity-100 lg:bottom-2'
                )}
            >
                <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="atlas-zoom"
                    aria-label={t('in')}
                    title={t('in')}
                    disabled={!!mode && zoom >= WORLD_MAX_ZOOM}
                    onClick={() => zoomBy(ZOOM_STEP)}
                >
                    <Plus className="size-4" />
                </Button>
                <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="atlas-zoom"
                    aria-label={t('out')}
                    title={t('out')}
                    disabled={!!mode && zoom <= minZoom}
                    onClick={() => zoomBy(1 / ZOOM_STEP)}
                >
                    <Minus className="size-4" />
                </Button>
                <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="atlas-zoom"
                    aria-label={t('reset')}
                    title={t('reset')}
                    onClick={reset}
                >
                    <RotateCcw className="size-4" />
                </Button>
                {fullscreen ? (
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="atlas-zoom"
                        aria-label={t(
                            fullscreen.full ? 'exitFullscreen' : 'fullscreen'
                        )}
                        title={t(
                            fullscreen.full ? 'exitFullscreen' : 'fullscreen'
                        )}
                        aria-pressed={fullscreen.full}
                        onClick={fullscreen.toggle}
                    >
                        {fullscreen.full ? (
                            <Minimize className="size-4" />
                        ) : (
                            <Maximize className="size-4" />
                        )}
                    </Button>
                ) : null}
            </div>
        </div>
    );
}
