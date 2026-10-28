"use client";

import { type PointerEvent, type ReactNode, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Minus, Plus, RotateCcw } from "lucide-react";

import { WorldFog } from "./WorldFog";
import { WorldHeroes } from "./WorldHeroes";
import { WorldPins } from "./WorldPins";
import { WorldZones } from "./WorldZones";

import "./world-atlas.css";
import { Button } from "@/components/ui/button";
import { WORLD_MAX_ZOOM } from "@/lib/constants/world";
import { useElementSize, useReducedMotion, useViewport } from "@/lib/hooks/common";
import type { WorldTool } from "@/lib/hooks/world";
import { cn } from "@/lib/utils";
import { fitBox, toMapPoint } from "@/lib/utils/world/geometry";
import type { MapPoint, RevealShape, WorldHero, WorldMapDetail } from "@/types/world";

const ZOOM_STEP = 1.5;

const MAX_SIZES_ZOOM = 2;

const FOCUS_ZOOM = 3;

export interface WorldMapViewProps {
  detail: WorldMapDetail;
  selectedId?: string | null;
  draft?: MapPoint[];
  tool?: WorldTool;
  handlers?: { onMapClick?(p: MapPoint): void; onMapDoubleClick?(p: MapPoint): void; onMarkerClick?(id: string): void; onMarkerDrag?(id: string, p: MapPoint): void; onHeroClick?(id: string): void };
  fog?: { shapes: RevealShape[]; radius: number };
  heroes?: WorldHero[];
  focus?: { point: MapPoint; seq: number };
  overlay?: ReactNode;
  hint?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function WorldMapView({ detail, selectedId, draft, tool = "select", handlers = {}, fog, heroes, focus, overlay, hint, compact = false, className }: WorldMapViewProps) {
  const { map, markers } = detail;

  const { ref: outerRef, size } = useElementSize<HTMLDivElement>();

  const box = fitBox(size, map.width / map.height);

  const { zoom, offset, containerRef, wasDragged, bind, reset, zoomBy, focusOn } = useViewport({ maxZoom: WORLD_MAX_ZOOM });

  const [dragging, setDragging] = useState<{ id: string; point: MapPoint } | null>(null);

  const pointAt = (clientX: number, clientY: number) => toMapPoint({ x: clientX, y: clientY }, containerRef.current?.getBoundingClientRect() ?? box, { zoom, offset });

  const [cursor, setCursor] = useState<MapPoint | null>(null);

  useEffect(() => {
    if (focus) focusOn(focus.point.x, focus.point.y, FOCUS_ZOOM);
  }, [focus, focusOn]);

  const layerStyle = { transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, transformOrigin: "0 0" };

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

    const zoneId = (tool === "select" || tool === "move") && e.target instanceof Element ? e.target.closest<SVGElement>("[data-zone-id]")?.dataset.zoneId : undefined;

    if (zoneId) handlers.onMarkerClick?.(zoneId);
    else handlers.onMapClick?.(pointAt(e.clientX, e.clientY));
  };

  return (
    <div data-tool={tool}
      data-still={still}
      className={cn("atlas-map relative h-full min-h-[16rem] w-full overflow-hidden rounded-xl border border-hud-rule", className)}
    >
      <div ref={outerRef} className="absolute inset-0">
        {/* container is always mounted so useViewport can attach its wheel listener on the first commit */}
        <div
            ref={containerRef}
            data-testid="world-map-box"
            className="atlas-sheet absolute overflow-hidden"
            style={{ left: box.left, top: box.top, width: box.width, height: box.height, touchAction: "none" }}
            onPointerDown={(e) => {
              pinGesture.current = false;
              bind.onPointerDown(e);
            }}
            onPointerMove={(e) => {
              bind.onPointerMove(e);

              if (tool === "zone" && draft?.length) setCursor(pointAt(e.clientX, e.clientY));
            }}
            onPointerUp={onBackgroundUp}
            onPointerCancel={bind.onPointerCancel}
            onDoubleClick={(e) => handlers.onMapDoubleClick?.(pointAt(e.clientX, e.clientY))}
          >
            {size.width > 0 ? (
            <div className="absolute inset-0" style={layerStyle}>
              <Image src={map.imageUrl} alt={map.name} fill priority draggable={false} sizes={`${Math.round(box.width * Math.min(zoom, MAX_SIZES_ZOOM))}px`} className="pointer-events-none select-none object-fill" />
              <WorldZones markers={markers} selectedId={selectedId} draft={draft} cursor={tool === "zone" ? cursor : null} interactive={tool === "select" || tool === "move"} />
              {draft?.map((p, i) => (
                <span
                  key={i}
                  className="atlas-draft-dot"
                  data-closable={i === 0 && draft.length >= 3}
                  style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, transform: `translate(-50%, -50%) scale(${1 / zoom})` }}
                />
              ))}
            </div>
            ) : null}
            {fog && size.width > 0 ? <WorldFog shapes={fog.shapes} radius={fog.radius} box={box} zoom={zoom} offset={offset} still={still} /> : null}
            {size.width > 0 ? (
            <div className="atlas-top-layer absolute inset-0" style={layerStyle}>
              <div className="contents" onPointerDownCapture={() => (pinGesture.current = true)} onPointerUpCapture={() => (pinGesture.current = false)}>
              <WorldPins
                markers={markers}
                zoom={zoom}
                compact={compact}
                selectedId={selectedId}
                dragging={dragging}
                handlers={handlers}
                onDragMove={(id, x, y) => setDragging({ id, point: pointAt(x, y) })}
                onDragEnd={(id, x, y) => {
                  setDragging(null);
                  handlers.onMarkerDrag?.(id, pointAt(x, y));
                }}
              />
              </div>
              {heroes?.length ? <WorldHeroes heroes={heroes} zoom={zoom} box={box} onHeroClick={handlers.onHeroClick} /> : null}
              {overlay}
            </div>
            ) : null}
          </div>
      </div>
      {hint ? <div className="pointer-events-none absolute top-2 right-2 left-2 z-10 flex justify-center">{hint}</div> : null}
      <div className="absolute right-2 bottom-14 z-10 flex flex-col gap-1 max-lg:opacity-60 max-lg:focus-within:opacity-100 max-lg:active:opacity-100 lg:bottom-2">
        <Button type="button" size="icon" variant="ghost" className="atlas-zoom" aria-label="Наблизити" onClick={() => zoomBy(ZOOM_STEP)}>
          <Plus className="size-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="atlas-zoom" aria-label="Віддалити" onClick={() => zoomBy(1 / ZOOM_STEP)}>
          <Minus className="size-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="atlas-zoom" aria-label="Скинути масштаб" onClick={reset}>
          <RotateCcw className="size-4" />
        </Button>
      </div>
    </div>
  );
}
