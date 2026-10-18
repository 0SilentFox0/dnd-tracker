"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

import { MapToken } from "./MapToken";
import { MapTokenHud } from "./MapTokenHud";

import { DEFAULT_MAP_BACKGROUND } from "@/lib/constants/battle";
import { useMapViewport } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { blockedSet, cellCenter, cellKey, type CellMark, cellPolygon, fitMapBox, mapSize, tokenBox, UNIT } from "@/lib/utils/battle/grid";
import type { BattleMapActions, BattleMapConfig, BattleMapView, BattleParticipant, GridPoint } from "@/types/battle";

export type { BattleMapActions, BattleMapView };

export interface BattleMapProps {
  map: BattleMapConfig;
  participants: BattleParticipant[];
  view?: BattleMapView;
  actions?: BattleMapActions;
  className?: string;
  clickableBlocked?: boolean;
  showBlocked?: boolean;
}

function markFill(mark: CellMark | number | undefined): string {
  if (mark === undefined) return "transparent";

  if (typeof mark === "number" || mark === "move") return "rgba(120,200,120,.28)";

  return mark === "target" ? "rgba(230,80,60,.35)" : "rgba(120,120,120,.25)";
}

interface GridLayerProps {
  map: BattleMapConfig;
  marks: BattleMapView["marks"];
  actions?: BattleMapActions;
  wasDragged: () => boolean;
  clickableBlocked?: boolean;
  showBlocked?: boolean;
}

const GridLayer = memo(function GridLayer({ map, marks, actions, wasDragged, clickableBlocked, showBlocked }: GridLayerProps) {
  const cells = useMemo(() => {
    const list: GridPoint[] = [];

    for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) list.push({ x, y });

    return list;
  }, [map.cols, map.rows]);

  const blocked = useMemo(() => blockedSet({ blocked: map.blocked }), [map.blocked]);

  return (
    <>
      {cells.map((p) =>
        blocked.has(cellKey(p)) ? (
          <polygon
            key={cellKey(p)}
            data-fx-cell={cellKey(p)}
            data-blocked=""
            points={cellPolygon(p)}
            fill={showBlocked ? "rgba(20,0,0,.6)" : "transparent"}
            stroke="none"
            pointerEvents={clickableBlocked ? "all" : "none"}
            style={{ cursor: clickableBlocked ? "pointer" : undefined }}
            onClick={clickableBlocked ? () => !wasDragged() && actions?.onCellClick?.(p) : undefined}
          />
        ) : (
        <polygon
          key={cellKey(p)}
          data-fx-cell={cellKey(p)}
          points={cellPolygon(p)}
          fill={markFill(marks?.get(cellKey(p)))}
          stroke="rgba(255,255,255,1)"
          strokeOpacity={map.opacity}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
          style={{ cursor: actions?.onCellClick ? "pointer" : undefined }}
          onClick={() => !wasDragged() && actions?.onCellClick?.(p)}
          onPointerEnter={() => actions?.onCellHover?.(p)}
        />
        ),
      )}
      {cells.map((p) => {
        const mark = marks?.get(cellKey(p));

        if (typeof mark !== "number" || blocked.has(cellKey(p))) return null;

        const c = cellCenter(p);

        return (
          <text key={`t${cellKey(p)}`} x={c.x} y={c.y} fontSize={UNIT * 0.22} textAnchor="middle" dominantBaseline="central" fill="#e8dcc4" opacity={0.8} pointerEvents="none">
            {mark}
          </text>
        );
      })}
    </>
  );
});

export function BattleMap({ map, participants, view, actions, className, clickableBlocked, showBlocked }: BattleMapProps) {
  const { zoom, offset, bind, containerRef, wasDragged } = useMapViewport();

  const { cols, rows } = map;

  const size = useMemo(() => mapSize({ cols, rows }), [cols, rows]);

  const outerRef = useRef<HTMLDivElement>(null);

  const [avail, setAvail] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = outerRef.current;

    if (!el) return;

    const rect = el.getBoundingClientRect();

    setAvail({ width: rect.width, height: rect.height });

    const observer = new ResizeObserver(([entry]) => setAvail({ width: entry.contentRect.width, height: entry.contentRect.height }));

    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  const fit = fitMapBox(avail, map);

  const pxPerUnit = fit.width / size.width;

  const tokens = useMemo(
    () =>
      participants
        .filter((p) => !p.battleData.reserved)
        .flatMap((p) => {
          const box = tokenBox(p);

          return box ? [{ p, box }] : [];
        }),
    [participants],
  );

  const onTokenClick = useCallback((id: string) => !wasDragged() && actions?.onTokenClick?.(id), [wasDragged, actions]);

  const movingId = view?.currentId && view.marks && [...view.marks.values()].some((m) => typeof m === "number") ? view.currentId : null;

  const from = view?.trajectory ? tokens.find((t) => t.p.basicInfo.id === view.trajectory?.fromId) : undefined;

  const end = view?.trajectory ? cellCenter(view.trajectory.to) : null;

  return (
    <div ref={outerRef} className={cn("flex h-full w-full items-center justify-center", className)}>
    <div
      ref={containerRef}
      data-fx-clip
      className="relative shrink-0 touch-none select-none overflow-hidden rounded-xl border border-white/10 bg-black"
      style={{ width: fit.width, height: fit.height }}
      {...bind}
    >
      <div className="absolute inset-0 origin-top-left" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}>
        <Image src={map.background ?? DEFAULT_MAP_BACKGROUND} alt="" fill sizes="100vw" className="object-cover" priority />
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="none">
          <GridLayer map={map} marks={view?.marks} actions={actions} wasDragged={wasDragged} clickableBlocked={clickableBlocked} showBlocked={showBlocked} />
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
            onClick={onTokenClick}
            passThrough={movingId === p.basicInfo.id}
          />
        ))}
        {tokens.map(({ p, box }) => {
          const id = p.basicInfo.id;

          const hud = view?.hud?.get(id);

          return (
            <MapTokenHud
              key={`hud:${id}`}
              participant={p}
              box={box}
              mapSize={size}
              pxPerUnit={pxPerUnit}
              exact={hud?.exact ?? true}
              raised={view?.selectedId === id || view?.currentId === id}
            />
          );
        })}
      </div>
    </div>
    </div>
  );
}
