"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { MapToken } from "./MapToken";

import { useMapViewport } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { cellCenter, cellKey, type CellMark, cellPolygon, mapSize, tokenBox, UNIT } from "@/lib/utils/battle/grid";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

export interface BattleMapView {
  selectedId?: string | null;
  currentId?: string | null;
  /** cellKey → позначка; число — вартість руху (показується дрібно в клітинці) */
  marks?: Map<string, CellMark | number>;
  /** Лінія траєкторії від учасника до клітинки/учасника */
  trajectory?: { fromId: string; to: GridPoint } | null;
}

export interface BattleMapActions {
  onCellClick?: (p: GridPoint) => void;
  onCellHover?: (p: GridPoint | null) => void;
  onTokenClick?: (id: string) => void;
}

export interface BattleMapProps {
  map: BattleMapConfig;
  participants: BattleParticipant[];
  view?: BattleMapView;
  actions?: BattleMapActions;
  className?: string;
}

function markFill(mark: CellMark | number | undefined): string {
  if (mark === undefined) return "transparent";

  if (typeof mark === "number" || mark === "move") return "rgba(120,200,120,.28)";

  return mark === "target" ? "rgba(230,80,60,.35)" : "rgba(120,120,120,.25)";
}

export function BattleMap({ map, participants, view, actions, className }: BattleMapProps) {
  const { zoom, offset, bind, containerRef, wasDragged } = useMapViewport();

  const size = mapSize(map);

  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;

    if (!el) return;

    setContainerWidth(el.getBoundingClientRect().width);

    const observer = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));

    observer.observe(el);

    return () => observer.disconnect();
  }, [containerRef]);

  const pxPerUnit = containerWidth / size.width;

  const cells: GridPoint[] = [];

  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) cells.push({ x, y });

  const tokens = participants
    .filter((p) => !p.battleData.reserved)
    .flatMap((p) => {
      const box = tokenBox(p);

      return box ? [{ p, box }] : [];
    });

  const from = view?.trajectory ? tokens.find((t) => t.p.basicInfo.id === view.trajectory?.fromId) : undefined;

  const end = view?.trajectory ? cellCenter(view.trajectory.to) : null;

  return (
    <div
      ref={containerRef}
      className={cn("relative touch-none select-none overflow-hidden rounded-xl border border-white/10 bg-black", className)}
      style={{ aspectRatio: size.width / size.height }}
      {...bind}
    >
      <div className="absolute inset-0 origin-top-left" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}>
        <Image src={map.background ?? "/screen-bg/battle-bg.webp"} alt="" fill sizes="100vw" className="object-cover" priority />
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="none">
          {cells.map((p) => {
            const mark = view?.marks?.get(cellKey(p));

            return (
              <polygon
                key={cellKey(p)}
                points={cellPolygon(p)}
                fill={markFill(mark)}
                stroke="rgba(255,255,255,1)"
                strokeOpacity={map.opacity}
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
                style={{ cursor: actions?.onCellClick ? "pointer" : undefined }}
                onClick={() => !wasDragged() && actions?.onCellClick?.(p)}
                onPointerEnter={() => actions?.onCellHover?.(p)}
              />
            );
          })}
          {cells.map((p) => {
            const mark = view?.marks?.get(cellKey(p));

            if (typeof mark !== "number") return null;

            const c = cellCenter(p);

            return (
              <text key={`t${cellKey(p)}`} x={c.x} y={c.y} fontSize={UNIT * 0.22} textAnchor="middle" dominantBaseline="central" fill="#e8dcc4" opacity={0.8} pointerEvents="none">
                {mark}
              </text>
            );
          })}
          {from && end && (
            <g pointerEvents="none">
              <line x1={from.box.cx} y1={from.box.cy} x2={end.x} y2={end.y} stroke="#f2c14e" strokeWidth={4} strokeDasharray="12 10" vectorEffect="non-scaling-stroke" pointerEvents="none" />
              <circle cx={end.x} cy={end.y} r={UNIT * 0.18} fill="#f2c14e" />
            </g>
          )}
        </svg>
        {tokens.map(({ p, box }) => (
          <MapToken
            key={p.basicInfo.id}
            participant={p}
            box={box}
            mapSize={size}
            pxPerUnit={pxPerUnit}
            selected={view?.selectedId === p.basicInfo.id}
            current={view?.currentId === p.basicInfo.id}
            onClick={(id) => !wasDragged() && actions?.onTokenClick?.(id)}
          />
        ))}
      </div>
    </div>
  );
}
