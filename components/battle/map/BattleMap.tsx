"use client";

import { memo, type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

import { MapToken } from "./MapToken";
import { MapTokenHud } from "./MapTokenHud";

import { DEFAULT_MAP_BACKGROUND } from "@/lib/constants/battle";
import { useMapViewport } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { blockedSet, cellCenter, cellKey, type CellMark, cellPolygon, fitMapBox, isMoveMark, mapSize, tokenBox, UNIT } from "@/lib/utils/battle/grid";
import type { BattleMapActions, BattleMapConfig, BattleMapView, BattleParticipant, GridPoint, TerrainCell } from "@/types/battle";

export type { BattleMapActions, BattleMapView };

export interface BattleMapProps {
  map: BattleMapConfig;
  participants: BattleParticipant[];
  view?: BattleMapView;
  actions?: BattleMapActions;
  className?: string;
  clickableBlocked?: boolean;
  showBlocked?: boolean;
  strokeTool?: boolean;
}

const HATCH_ID = "battle-map-barrier-hatch";

const ZONE = {
  move: { fill: "rgba(70,200,70,.16)", stroke: "#7dff5a", glow: "rgba(125,255,90,.28)" },
  danger: { fill: "rgba(220,60,50,.2)", stroke: "#ff5a4a", glow: "rgba(255,90,74,.3)" },
} as const;

type MarkValue = CellMark | number | undefined;

function zoneOf(mark: MarkValue) {
  if (mark === "move-danger") return ZONE.danger;

  return isMoveMark(mark) ? ZONE.move : null;
}

function markFill(mark: MarkValue): string {
  const zone = zoneOf(mark);

  if (zone) return zone.fill;

  if (mark === "target") return "rgba(230,80,60,.35)";

  return mark === "invalid-target" ? "rgba(120,120,120,.25)" : "transparent";
}

function terrainTitle(t: TerrainCell): string | null {
  if (t.kind === "barrier") return `Барʼєр${t.untilRound !== undefined ? ` до кінця раунду ${t.untilRound}` : ""}`;

  return t.kind === "hazard" ? (t.label ?? "Небезпечна місцевість") : null;
}

const TERRAIN_FILL = { wall: "rgba(0,0,0,.6)", barrier: "rgba(0,0,0,.75)", hazard: "rgba(200,40,30,.28)" } as const;

interface GridLayerProps {
  map: BattleMapConfig;
  marks: BattleMapView["marks"];
  actions?: BattleMapActions;
  wasDragged: () => boolean;
  clickableBlocked?: boolean;
  showBlocked?: boolean;
  stroke?: { preview: Set<string>; start(p: GridPoint, e: PointerEvent): void; enter(p: GridPoint): void };
}

const GridLayer = memo(function GridLayer({ map, marks, actions, wasDragged, clickableBlocked, showBlocked, stroke }: GridLayerProps) {
  const cells = useMemo(() => {
    const list: GridPoint[] = [];

    for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) list.push({ x, y });

    return list;
  }, [map.cols, map.rows]);

  const blocked = useMemo(() => blockedSet({ blocked: map.blocked }), [map.blocked]);

  const terrain = map.terrain;

  const terrainCells = useMemo(() => cells.flatMap((p) => (terrain?.[cellKey(p)] ? [{ p, cell: terrain[cellKey(p)] }] : [])), [cells, terrain]);

  const zoneCells = cells.flatMap((p) => {
    const zone = blocked.has(cellKey(p)) ? null : zoneOf(marks?.get(cellKey(p)));

    return zone ? [{ p, zone }] : [];
  });

  return (
    <>
      <defs>
        <pattern id={HATCH_ID} patternUnits="userSpaceOnUse" width={UNIT * 0.14} height={UNIT * 0.14} patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2={UNIT * 0.14} stroke="rgba(255,255,255,.28)" strokeWidth={UNIT * 0.03} />
        </pattern>
      </defs>
      {terrainCells.map(({ p, cell }) => {
        return (
          <g key={`t${cellKey(p)}`} data-terrain={cell.kind} pointerEvents="none">
            <polygon points={cellPolygon(p)} fill={TERRAIN_FILL[cell.kind]} stroke={cell.kind === "hazard" ? "#ff5a4a" : "none"} strokeOpacity={0.7} strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
            {cell.kind === "barrier" && <polygon points={cellPolygon(p)} fill={`url(#${HATCH_ID})`} stroke="none" />}
          </g>
        );
      })}
      {cells.map((p) => {
        const key = cellKey(p);

        if (blocked.has(key)) {
          return (
            <polygon
              key={key}
              data-fx-cell={key}
              data-blocked=""
              points={cellPolygon(p)}
              fill={showBlocked ? "rgba(20,0,0,.6)" : "transparent"}
              stroke="none"
              pointerEvents={clickableBlocked ? "all" : "none"}
              style={{ cursor: clickableBlocked ? "pointer" : undefined }}
              onClick={clickableBlocked && !stroke ? () => !wasDragged() && actions?.onCellClick?.(p) : undefined}
              onPointerDown={stroke ? (e) => stroke.start(p, e) : undefined}
              onPointerEnter={stroke ? () => stroke.enter(p) : undefined}
            />
          );
        }

        const mark = marks?.get(key);

        const cell = terrain?.[key];

        const title = cell && terrainTitle(cell);

        const gridless = zoneOf(mark) !== null || cell?.kind === "wall" || cell?.kind === "barrier";

        return (
          <polygon
            key={key}
            data-fx-cell={key}
            points={cellPolygon(p)}
            fill={markFill(mark)}
            stroke={gridless ? "none" : "rgba(255,255,255,1)"}
            strokeOpacity={map.opacity}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            style={{ cursor: stroke ? "crosshair" : actions?.onCellClick ? "pointer" : undefined }}
            onClick={stroke ? undefined : () => !wasDragged() && actions?.onCellClick?.(p)}
            onPointerDown={stroke ? (e) => stroke.start(p, e) : undefined}
            onPointerEnter={() => (stroke ? stroke.enter(p) : actions?.onCellHover?.(p))}
          >
            {title && <title>{title}</title>}
          </polygon>
        );
      })}
      {stroke && (
        <g pointerEvents="none">
          {cells.filter((p) => stroke.preview.has(cellKey(p))).map((p) => (
            <polygon key={`s${cellKey(p)}`} data-stroke={cellKey(p)} points={cellPolygon(p)} fill="rgba(242,193,78,.35)" stroke="#f2c14e" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
      )}
      <g pointerEvents="none">
        {zoneCells.map(({ p, zone }) => (
          <polygon key={`g${cellKey(p)}`} points={cellPolygon(p)} fill="none" stroke={zone.glow} strokeWidth={7} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        ))}
        {zoneCells.map(({ p, zone }) => (
          <polygon
            key={`z${cellKey(p)}`}
            data-fx-zone={zone === ZONE.danger ? "danger" : "move"}
            points={cellPolygon(p)}
            fill="none"
            stroke={zone.stroke}
            strokeWidth={2.5}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    </>
  );
});

export function BattleMap({ map, participants, view, actions, className, clickableBlocked, showBlocked, strokeTool }: BattleMapProps) {
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

  const painting = Boolean(strokeTool && actions?.onStroke);

  const strokeRef = useRef<GridPoint[] | null>(null);

  const [preview, setPreview] = useState<Set<string>>(() => new Set());

  const onStrokeStart = useCallback((p: GridPoint, e: PointerEvent) => {
    e.stopPropagation();

    try {
      (e.target as Element).releasePointerCapture?.(e.pointerId);
    } catch {
      // not captured
    }

    strokeRef.current = [p];
    setPreview(new Set([cellKey(p)]));
  }, []);

  const onStrokeEnter = useCallback((p: GridPoint) => {
    const list = strokeRef.current;

    if (!list || list.some((c) => c.x === p.x && c.y === p.y)) return;

    list.push(p);
    setPreview(new Set(list.map(cellKey)));
  }, []);

  const onStroke = actions?.onStroke;

  useEffect(() => {
    if (!painting) return;

    const finish = (commit: boolean) => () => {
      const list = strokeRef.current;

      if (!list) return;

      strokeRef.current = null;
      setPreview(new Set());

      if (commit) onStroke?.(list);
    };

    const up = finish(true);

    const cancel = finish(false);

    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);

    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      strokeRef.current = null;
    };
  }, [painting, onStroke]);

  const stroke = useMemo(() => (painting ? { preview, start: onStrokeStart, enter: onStrokeEnter } : undefined), [painting, preview, onStrokeStart, onStrokeEnter]);

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

  const movingId = view?.currentId && view.marks && [...view.marks.values()].some((m) => isMoveMark(m)) ? view.currentId : null;

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
          <GridLayer map={map} marks={view?.marks} actions={actions} wasDragged={wasDragged} clickableBlocked={clickableBlocked} showBlocked={showBlocked} stroke={stroke} />
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
            passThrough={painting || movingId === p.basicInfo.id}
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
              exact={hud?.exact ?? false}
              raised={view?.selectedId === id || view?.currentId === id}
            />
          );
        })}
      </div>
    </div>
    </div>
  );
}
