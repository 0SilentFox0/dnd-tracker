import { MapPin } from "lucide-react";

import { MARKER_ICON } from "./marker-icons";

import { DRAG_THRESHOLD } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";
import { polygonCentroid } from "@/lib/utils/world/geometry";
import type { MapPoint, WorldMarker } from "@/types/world";

export interface PinHandlers {
  onMarkerClick?(id: string): void;
  onMarkerDrag?(id: string, p: MapPoint): void;
}

interface WorldPinsProps {
  markers: WorldMarker[];
  zoom: number;
  selectedId?: string | null;
  dragging: { id: string; point: MapPoint } | null;
  handlers: PinHandlers;
  onDragMove(id: string, clientX: number, clientY: number): void;
  onDragEnd(id: string, clientX: number, clientY: number): void;
}

const anchor = (m: WorldMarker): MapPoint => (m.kind === "zone" && m.polygon ? polygonCentroid(m.polygon) : { x: m.x, y: m.y });

export function WorldPins({ markers, zoom, selectedId, dragging, handlers, onDragMove, onDragEnd }: WorldPinsProps) {
  return (
    <>
      {markers.map((m) => {
        const spot = dragging?.id === m.id ? dragging.point : anchor(m);

        const isZone = m.kind === "zone";

        const Icon = (m.icon && MARKER_ICON[m.icon]) || MapPin;

        const draggable = !isZone && !!handlers.onMarkerDrag;

        return (
          <button
            key={m.id}
            type="button"
            aria-label={m.name}
            title={m.name}
            style={{
              left: `${spot.x * 100}%`,
              top: `${spot.y * 100}%`,
              transform: `translate(-50%, ${isZone ? "-50%" : "-100%"}) scale(${1 / zoom})`,
              transformOrigin: isZone ? "50% 50%" : "50% 100%",
              touchAction: "none",
            }}
            className={cn(
              "absolute flex items-center gap-1 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-xs shadow",
              isZone ? "border-hud-rule bg-black/60 text-hud-ink" : "border-hud-rule bg-[rgba(17,14,11,.85)] text-hud-ink",
              m.id === selectedId && "ring-2 ring-[var(--gold)]",
            )}
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
            {isZone ? null : <Icon className="size-4" aria-hidden />}
            <span>{m.name}</span>
          </button>
        );
      })}
    </>
  );
}
