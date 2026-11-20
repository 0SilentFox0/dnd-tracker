'use client';

import { MapPin } from 'lucide-react';

import { HudButton } from '@/components/hud';
import { MARKER_ICON } from '@/components/world/marker-icons';
import {
    WORLD_LABEL_ZOOM,
    WORLD_LABEL_ZOOM_COMPACT,
    WORLD_ZONE_LABEL_CONFLICT,
    WORLD_ZONE_LABEL_CONFLICT_COMPACT,
} from '@/lib/constants/world';
import { usePinGesture } from '@/lib/hooks/world';
import { markerAnchor } from '@/lib/utils/world/geometry';
import { isMinorPin, pinHiddenAtZoom } from '@/lib/utils/world/pin-tier';
import { zoneLabelSize, zoneLabelVisible } from '@/lib/utils/world/zone-labels';
import type { MapPoint, WorldMarker } from '@/types/world';

export interface PinHandlers {
    onMarkerClick?(id: string): void;
    onMarkerDoubleClick?(id: string): void;
    onMarkerDrag?(id: string, p: MapPoint): void;
}

interface WorldPinsProps {
    markers: WorldMarker[];
    zoom: number;
    compact?: boolean;
    labels?: { hoveredId?: string | null; fogless?: boolean };
    selectedId?: string | null;
    drag: {
        current: { id: string; point: MapPoint } | null;
        onMove(id: string, clientX: number, clientY: number): void;
        onEnd(id: string, clientX: number, clientY: number): void;
        onCancel(): void;
    };
    handlers: PinHandlers;
}

export const sealStyle = (color: string) => ({
    background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${color} 70%, white), ${color} 62%, color-mix(in srgb, ${color} 55%, black))`,
});

export function WorldPins({
    markers,
    zoom,
    compact = false,
    labels,
    selectedId,
    drag,
    handlers,
}: WorldPinsProps) {
    const {
        current: dragging,
        onMove: onDragMove,
        onEnd: onDragEnd,
        onCancel: onDragCancel,
    } = drag;

    const { bind } = usePinGesture<string>({
        draggable: !!handlers.onMarkerDrag,
        onClick: handlers.onMarkerClick,
        onDragMove: (id, e) => onDragMove(id, e.clientX, e.clientY),
        onDragEnd: (id, e) => onDragEnd(id, e.clientX, e.clientY),
        onCancel: onDragCancel,
    });

    const isPinned = (m: WorldMarker) =>
        m.id === selectedId || m.id === dragging?.id;

    const points = markers.filter(
        (m) => m.kind !== 'zone' && !pinHiddenAtZoom(m, zoom, isPinned(m))
    );

    const labelBlockers = points.filter((m) => !isMinorPin(m));

    const shownZoneLabels: MapPoint[] = [];

    return (
        <>
            {markers.map((m) => {
                const spot =
                    dragging?.id === m.id ? dragging.point : markerAnchor(m);

                if (m.kind === 'zone') {
                    const clashes = labelBlockers.some(
                        (p) =>
                            Math.hypot(p.x - spot.x, p.y - spot.y) <
                            WORLD_ZONE_LABEL_CONFLICT
                    );

                    const overlaps =
                        compact &&
                        shownZoneLabels.some(
                            (p) =>
                                Math.hypot(p.x - spot.x, p.y - spot.y) <
                                WORLD_ZONE_LABEL_CONFLICT_COMPACT
                        );

                    const hovered = labels?.hoveredId === m.id;

                    if (
                        !zoneLabelVisible({
                            zoom,
                            known: m.alwaysVisible,
                            fogless: !!labels?.fogless,
                            clashes,
                            overlaps,
                            hovered,
                        })
                    )
                        return null;

                    shownZoneLabels.push(spot);

                    return (
                        <span
                            key={m.id}
                            aria-label={m.name}
                            role="button"
                            tabIndex={-1}
                            className="atlas-zone-label"
                            style={{
                                left: `${spot.x * 100}%`,
                                top: `${spot.y * 100}%`,
                                transform: `translate(-50%, -50%) scale(${1 / zoom})`,
                                fontSize: m.polygon
                                    ? zoneLabelSize(m.polygon, zoom)
                                    : undefined,
                            }}
                        >
                            {m.name}
                        </span>
                    );
                }

                if (pinHiddenAtZoom(m, zoom, isPinned(m))) return null;

                const Icon = (m.icon && MARKER_ICON[m.icon]) || MapPin;

                const minor = isMinorPin(m);

                return (
                    <HudButton
                        key={m.id}
                        type="button"
                        aria-label={m.name}
                        data-tour={
                            m.id === points[0]?.id ? 'world.marker' : undefined
                        }
                        data-selected={m.id === selectedId}
                        data-minor={minor}
                        data-labels={
                            zoom >=
                            (compact
                                ? WORLD_LABEL_ZOOM_COMPACT
                                : WORLD_LABEL_ZOOM)
                        }
                        data-dragging={dragging?.id === m.id}
                        style={{
                            left: `${spot.x * 100}%`,
                            top: `${spot.y * 100}%`,
                            transform: `translate(-50%, -50%) scale(${1 / zoom})`,
                            touchAction: 'none',
                        }}
                        className="atlas-pin absolute"
                        {...bind(m.id)}
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            handlers.onMarkerDoubleClick?.(m.id);
                        }}
                    >
                        <span
                            className="atlas-seal"
                            style={m.color ? sealStyle(m.color) : undefined}
                        >
                            <Icon
                                className={minor ? 'size-2.5' : 'size-4'}
                                aria-hidden
                            />
                        </span>
                        <span className="atlas-label">{m.name}</span>
                    </HudButton>
                );
            })}
        </>
    );
}
