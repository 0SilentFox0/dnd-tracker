'use client';

import { type PointerEvent, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { HudButton } from '@/components/hud';
import { closePolygon } from '@/lib/utils/world/geometry';
import type { MapPoint, Polygon } from '@/types/world';

const MIN_VERTICES = 3;

interface ZoneVertexHandlesProps {
    markerId: string;
    polygon: Polygon;
    zoom: number;
    pointAt(clientX: number, clientY: number, alt: boolean): MapPoint;
    onPreview(polygon: Polygon | null): void;
    onChange(markerId: string, polygon: Polygon): void;
}

const toRing = (pts: MapPoint[]): Polygon | null => closePolygon(pts);

export function ZoneVertexHandles({
    markerId,
    polygon,
    zoom,
    pointAt,
    onPreview,
    onChange,
}: ZoneVertexHandlesProps) {
    const t = useTranslations('world.vertex');

    const open = polygon
        .slice(0, -1)
        .map(([x, y]): MapPoint => ({ x, y }));

    const [drag, setDrag] = useState<{
        index: number;
        pts: MapPoint[];
        insert: boolean;
    } | null>(null);

    const moved = useRef(false);

    const pts = drag?.pts ?? open;

    const place = (p: MapPoint) => ({
        left: `${p.x * 100}%`,
        top: `${p.y * 100}%`,
        transform: `translate(-50%, -50%) scale(${1 / zoom})`,
    });

    const start = (
        e: PointerEvent<HTMLElement>,
        index: number,
        base: MapPoint[],
        insert = false
    ) => {
        e.stopPropagation();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        moved.current = false;
        setDrag({ index, pts: base, insert });
    };

    const move = (e: PointerEvent<HTMLElement>) => {
        if (!drag) return;

        moved.current = true;

        const next = drag.pts.map((p, i) =>
            i === drag.index ? pointAt(e.clientX, e.clientY, e.altKey) : p
        );

        setDrag({ ...drag, pts: next });
        onPreview(toRing(next));
    };

    const end = () => {
        if (!drag) return;

        const ring = toRing(drag.pts);

        setDrag(null);
        onPreview(null);

        if ((moved.current || drag.insert) && ring) onChange(markerId, ring);
    };

    const remove = (index: number) => {
        if (open.length <= MIN_VERTICES) return;

        const ring = toRing(open.filter((_, i) => i !== index));

        if (ring) onChange(markerId, ring);
    };

    return (
        <>
            {pts.map((p, i) => {
                const q = pts[(i + 1) % pts.length];

                const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };

                return (
                    <span key={i} className="contents">
                        <HudButton
                            type="button"
                            data-vertex={i}
                            aria-label={t('vertex', { index: i + 1 })}
                            className="atlas-vertex"
                            style={place(p)}
                            onPointerDown={(e) => start(e, i, pts)}
                            onPointerMove={move}
                            onPointerUp={(e) => {
                                e.stopPropagation();
                                end();
                            }}
                            onPointerCancel={end}
                            onDoubleClick={(e) => {
                                e.stopPropagation();
                                remove(i);
                            }}
                        />
                        {(
                            <HudButton
                                type="button"
                                data-mid="true"
                                aria-label={t('insert')}
                                className="atlas-vertex"
                                style={{
                                    ...place(mid),
                                    visibility: drag ? 'hidden' : undefined,
                                }}
                                onPointerDown={(e) => {
                                    const next = [
                                        ...pts.slice(0, i + 1),
                                        mid,
                                        ...pts.slice(i + 1),
                                    ];

                                    start(e, i + 1, next, true);
                                }}
                                onPointerMove={move}
                                onPointerUp={(e) => {
                                    e.stopPropagation();
                                    end();
                                }}
                                onPointerCancel={end}
                            />
                        )}
                    </span>
                );
            })}
        </>
    );
}
