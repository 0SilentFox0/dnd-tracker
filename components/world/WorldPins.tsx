import { MapPin } from "lucide-react";

import { MARKER_ICON } from "./marker-icons";

import { WORLD_LABEL_ZOOM, WORLD_LABEL_ZOOM_COMPACT, WORLD_ZONE_LABEL_CONFLICT, WORLD_ZONE_LABEL_CONFLICT_COMPACT, WORLD_ZONE_LABEL_HIDE_ZOOM } from "@/lib/constants/world";
import { DRAG_THRESHOLD } from "@/lib/hooks/common";
import { polygonCentroid } from "@/lib/utils/world/geometry";
import type { MapPoint, WorldMarker } from "@/types/world";

export interface PinHandlers {
  onMarkerClick?(id: string): void;
  onMarkerDrag?(id: string, p: MapPoint): void;
}

interface WorldPinsProps {
  markers: WorldMarker[];
  zoom: number;
  compact?: boolean;
  selectedId?: string | null;
  dragging: { id: string; point: MapPoint } | null;
  handlers: PinHandlers;
  onDragMove(id: string, clientX: number, clientY: number): void;
  onDragEnd(id: string, clientX: number, clientY: number): void;
}

const anchor = (m: WorldMarker): MapPoint => (m.kind === "zone" && m.polygon ? polygonCentroid(m.polygon) : { x: m.x, y: m.y });

export function WorldPins({ markers, zoom, compact = false, selectedId, dragging, handlers, onDragMove, onDragEnd }: WorldPinsProps) {
  const points = markers.filter((m) => m.kind !== "zone");

  const shownZoneLabels: MapPoint[] = [];

  return (
    <>
      {markers.map((m) => {
        const spot = dragging?.id === m.id ? dragging.point : anchor(m);

        if (m.kind === "zone") {
          const clashes = points.some((p) => Math.hypot(p.x - spot.x, p.y - spot.y) < WORLD_ZONE_LABEL_CONFLICT);

          const overlaps = compact && shownZoneLabels.some((p) => Math.hypot(p.x - spot.x, p.y - spot.y) < WORLD_ZONE_LABEL_CONFLICT_COMPACT);

          if (zoom > WORLD_ZONE_LABEL_HIDE_ZOOM || clashes || overlaps) return null;

          shownZoneLabels.push(spot);

          return (
            <span
              key={m.id}
              aria-label={m.name}
              role="button"
              tabIndex={-1}
              className="atlas-zone-label"
              style={{ left: `${spot.x * 100}%`, top: `${spot.y * 100}%`, transform: `translate(-50%, -50%) scale(${1 / zoom})` }}
            >
              {m.name}
            </span>
          );
        }

        const Icon = (m.icon && MARKER_ICON[m.icon]) || MapPin;

        const draggable = !!handlers.onMarkerDrag;

        return (
          <button
            key={m.id}
            type="button"
            aria-label={m.name}
            data-selected={m.id === selectedId}
            data-labels={zoom >= (compact ? WORLD_LABEL_ZOOM_COMPACT : WORLD_LABEL_ZOOM)}
            data-dragging={dragging?.id === m.id}
            style={{
              left: `${spot.x * 100}%`,
              top: `${spot.y * 100}%`,
              transform: `translate(-50%, -50%) scale(${1 / zoom})`,
              touchAction: "none",
            }}
            className="atlas-pin absolute"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.currentTarget.dataset.startX = String(e.clientX);
              e.currentTarget.dataset.startY = String(e.clientY);
              e.currentTarget.setPointerCapture?.(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!draggable || e.currentTarget.dataset.startX === undefined) return;

              const moved = Math.hypot(e.clientX - Number(e.currentTarget.dataset.startX), e.clientY - Number(e.currentTarget.dataset.startY)) > DRAG_THRESHOLD;

              if (moved) onDragMove(m.id, e.clientX, e.clientY);
            }}
            onPointerUp={(e) => {
              const startX = e.currentTarget.dataset.startX;

              if (startX === undefined) return;

              e.stopPropagation();

              const moved = draggable && Math.hypot(e.clientX - Number(startX), e.clientY - Number(e.currentTarget.dataset.startY)) > DRAG_THRESHOLD;

              delete e.currentTarget.dataset.startX;
              delete e.currentTarget.dataset.startY;

              if (moved) onDragEnd(m.id, e.clientX, e.clientY);
              else handlers.onMarkerClick?.(m.id);
            }}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            <span className="atlas-seal">
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="atlas-label">{m.name}</span>
          </button>
        );
      })}
    </>
  );
}
