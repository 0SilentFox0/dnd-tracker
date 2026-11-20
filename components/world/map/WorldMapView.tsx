'use client';

import {
    type PointerEvent,
    type ReactNode,
    useEffect,
    useRef,
    useState,
} from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Minus, Plus, RotateCcw } from 'lucide-react';

import { WorldFog } from './WorldFog';
import { WorldHeroes } from './WorldHeroes';
import { WorldPins } from './WorldPins';
import { WorldTrails, type WorldTrailsProps } from './WorldTrails';
import { WorldZones } from './WorldZones';
import { ZoneVertexHandles } from './ZoneVertexHandles';

import '../world-atlas.css';
import { Button } from '@/components/ui/button';
import { WORLD_MAX_ZOOM, WORLD_SNAP_PX } from '@/lib/constants/world';
import {
    useElementSize,
    useReducedMotion,
    useViewport,
} from '@/lib/hooks/common';
import { useMarkerBubblePosition, type WorldTool } from '@/lib/hooks/world';
import { cn } from '@/lib/utils';
import { fitBox, toMapPoint } from '@/lib/utils/world/geometry';
import { hintPosition } from '@/lib/utils/world/hint-position';
import { snapPoint } from '@/lib/utils/world/zone-snap';
import type {
    MapPoint,
    Polygon,
    RevealShape,
    WorldHero,
    WorldMapDetail,
} from '@/types/world';

const ZOOM_STEP = 1.5;

const MAX_SIZES_ZOOM = 2;

const FOCUS_ZOOM = 3;

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
        onVertexChange?(markerId: string, polygon: Polygon): void;
    };
    fog?: { shapes: RevealShape[]; radius: number };
    heroes?: WorldHero[];
    dragHeroes?: {
        onDrop(ids: string[], to: MapPoint): void;
        selected: string[];
    };
    trails?: Omit<WorldTrailsProps, 'zoom'>;
    focus?: { point: MapPoint; seq: number };
    slots?: {
        overlay?: ReactNode;
        card?: { point: MapPoint; content: ReactNode };
        hint?: ReactNode;
    };
    compact?: boolean;
    className?: string;
}

const zoneIdAt = (target: EventTarget | null, tool: WorldTool) =>
    (tool === 'select' || tool === 'move') && target instanceof Element
        ? target.closest<SVGElement>('[data-zone-id]')?.dataset.zoneId
        : undefined;

const CARD_FALLBACK_SIZE = { width: 256, height: 140 };

function CardSlot({
    card,
    box,
    zoom,
    offset,
}: {
    card: { point: MapPoint; content: ReactNode };
    box: { width: number; height: number };
    zoom: number;
    offset: { x: number; y: number };
}) {
    const { ref, size } = useElementSize<HTMLDivElement>();

    const pos = useMarkerBubblePosition({
        point: card.point,
        box,
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
    heroes,
    dragHeroes,
    trails,
    focus,
    slots,
    compact = false,
    className,
}: WorldMapViewProps) {
    const { map, markers } = detail;

    const { tool = 'select', draft, snap } = edit ?? {};

    const { overlay, card, hint } = slots ?? {};

    const t = useTranslations('world.zoom');

    const { ref: outerRef, size } = useElementSize<HTMLDivElement>();

    const box = fitBox(size, map.width / map.height);

    const {
        zoom,
        offset,
        containerRef,
        wasDragged,
        bind,
        reset,
        zoomBy,
        focusOn,
    } = useViewport({ maxZoom: WORLD_MAX_ZOOM });

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

        const inside =
            clientX >= r.left &&
            clientX <= r.right &&
            clientY >= r.top &&
            clientY <= r.bottom;

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

    const shownMarkers = preview
        ? markers.map((m) =>
              m.id === preview.id ? { ...m, polygon: preview.polygon } : m
          )
        : markers;

    const editingZone =
        tool === 'select' && handlers.onVertexChange
            ? shownMarkers.find(
                  (m) => m.id === selectedId && m.kind === 'zone' && m.polygon
              )
            : undefined;

    const [hoveredZone, setHoveredZone] = useState<string | null>(null);

    const [pointer, setPointer] = useState<HintPointer | null>(null);

    const [cursor, setCursor] = useState<MapPoint | null>(null);

    useEffect(() => {
        if (focus) focusOn(focus.point.x, focus.point.y, FOCUS_ZOOM);
    }, [focus, focusOn]);

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

        if (wasDragged()) return;

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
            data-still={still}
            className={cn(
                'atlas-map relative h-full min-h-[16rem] w-full overflow-hidden rounded-xl border border-hud-rule',
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
                                src={map.imageUrl}
                                alt={map.name}
                                fill
                                priority
                                draggable={false}
                                sizes={`${Math.round(box.width * Math.min(zoom, MAX_SIZES_ZOOM))}px`}
                                className="pointer-events-none object-fill select-none"
                            />
                            <WorldZones
                                markers={shownMarkers}
                                selectedId={selectedId}
                                draft={draft}
                                cursor={tool === 'zone' ? cursor : null}
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
                                    markers={markers}
                                    zoom={zoom}
                                    compact={compact}
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
                                    }}
                                    handlers={handlers}
                                />
                            </div>
                            {trails ? (
                                <WorldTrails {...trails} zoom={zoom} />
                            ) : null}
                            {heroes?.length ? (
                                <WorldHeroes
                                    heroes={heroes}
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
                className="absolute right-2 bottom-14 z-10 flex flex-col gap-1 max-lg:opacity-60 max-lg:focus-within:opacity-100 max-lg:active:opacity-100 lg:bottom-2"
            >
                <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="atlas-zoom"
                    aria-label={t('in')}
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
                    onClick={reset}
                >
                    <RotateCcw className="size-4" />
                </Button>
            </div>
        </div>
    );
}
