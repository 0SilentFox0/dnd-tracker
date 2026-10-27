"use client";

import { type PointerEvent, type ReactNode, useState } from "react";
import Image from "next/image";
import { Minus, Plus, RotateCcw } from "lucide-react";

import { WorldPins } from "./WorldPins";
import { WorldZones } from "./WorldZones";

import { Button } from "@/components/ui/button";
import { WORLD_MAX_ZOOM } from "@/lib/constants/world";
import { useElementSize, useViewport } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";
import { fitBox, toMapPoint } from "@/lib/utils/world/geometry";
import type { MapPoint, WorldMapDetail } from "@/types/world";

const ZOOM_STEP = 1.5;

const MAX_SIZES_ZOOM = 2;

export interface WorldMapViewProps {
  detail: WorldMapDetail;
  selectedId?: string | null;
  draft?: MapPoint[];
  handlers?: { onMapClick?(p: MapPoint): void; onMapDoubleClick?(p: MapPoint): void; onMarkerClick?(id: string): void; onMarkerDrag?(id: string, p: MapPoint): void };
  overlay?: ReactNode;
  className?: string;
}

export function WorldMapView({ detail, selectedId, draft, handlers = {}, overlay, className }: WorldMapViewProps) {
  const { map, markers } = detail;

  const { ref: outerRef, size } = useElementSize<HTMLDivElement>();

  const box = fitBox(size, map.width / map.height);

  const { zoom, offset, containerRef, wasDragged, bind, reset, zoomBy } = useViewport({ maxZoom: WORLD_MAX_ZOOM });

  const [dragging, setDragging] = useState<{ id: string; point: MapPoint } | null>(null);

  const pointAt = (clientX: number, clientY: number) => toMapPoint({ x: clientX, y: clientY }, containerRef.current?.getBoundingClientRect() ?? box, { zoom, offset });

  const onBackgroundUp = (e: PointerEvent<HTMLElement>) => {
    bind.onPointerUp(e);

    if (!wasDragged()) handlers.onMapClick?.(pointAt(e.clientX, e.clientY));
  };

  return (
    <div className={cn("relative h-full min-h-[16rem] w-full overflow-hidden rounded-xl border border-hud-rule bg-black/40", className)}>
      <div ref={outerRef} className="absolute inset-0">
        {size.width > 0 ? (
          <div
            ref={containerRef}
            data-testid="world-map-box"
            className="absolute overflow-hidden"
            style={{ left: box.left, top: box.top, width: box.width, height: box.height, touchAction: "none" }}
            onPointerDown={bind.onPointerDown}
            onPointerMove={bind.onPointerMove}
            onPointerUp={onBackgroundUp}
            onPointerCancel={bind.onPointerCancel}
            onDoubleClick={(e) => handlers.onMapDoubleClick?.(pointAt(e.clientX, e.clientY))}
          >
            <div className="absolute inset-0" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, transformOrigin: "0 0" }}>
              <Image src={map.imageUrl} alt={map.name} fill priority draggable={false} sizes={`${Math.round(box.width * Math.min(zoom, MAX_SIZES_ZOOM))}px`} className="pointer-events-none select-none object-fill" />
              <WorldZones markers={markers} selectedId={selectedId} draft={draft} />
              {draft?.map((p, i) => (
                <span
                  key={i}
                  className="pointer-events-none absolute size-2 rounded-full bg-[var(--gold)]"
                  style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, transform: `translate(-50%, -50%) scale(${1 / zoom})` }}
                />
              ))}
              <WorldPins
                markers={markers}
                zoom={zoom}
                selectedId={selectedId}
                dragging={dragging}
                handlers={handlers}
                onDragMove={(id, x, y) => setDragging({ id, point: pointAt(x, y) })}
                onDragEnd={(id, x, y) => {
                  setDragging(null);
                  handlers.onMarkerDrag?.(id, pointAt(x, y));
                }}
              />
              {overlay}
            </div>
          </div>
        ) : null}
      </div>
      <div className="absolute right-2 bottom-2 flex flex-col gap-1">
        <Button type="button" size="icon" variant="secondary" aria-label="Наблизити" onClick={() => zoomBy(ZOOM_STEP)}>
          <Plus className="size-4" />
        </Button>
        <Button type="button" size="icon" variant="secondary" aria-label="Віддалити" onClick={() => zoomBy(1 / ZOOM_STEP)}>
          <Minus className="size-4" />
        </Button>
        <Button type="button" size="icon" variant="secondary" aria-label="Скинути масштаб" onClick={reset}>
          <RotateCcw className="size-4" />
        </Button>
      </div>
    </div>
  );
}
