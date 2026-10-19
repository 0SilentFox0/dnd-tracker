"use client";

import { memo, type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Flame } from "lucide-react";

import { ATTACK_CURSOR } from "./attack-cursors";
import { MapToken } from "./MapToken";
import { MapTokenHud } from "./MapTokenHud";

import "./battle-map.css";
import { DEFAULT_HAZARD_LABEL, DEFAULT_MAP_BACKGROUND } from "@/lib/constants/battle";
import { DRAG_THRESHOLD, useMapViewport } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import {
  blockedSet,
  cellAtScreenPoint,
  cellCenter,
  cellDistance,
  cellKey,
  cellLine,
  type CellMark,
  cellPolygon,
  centreCell,
  fitMapView,
  isMoveMark,
  mapSize,
  playableBounds,
  tokenBox,
  UNIT,
} from "@/lib/utils/battle/grid";
import type { BattleMapActions, BattleMapConfig, BattleMapView, BattleParticipant, GridPoint, TerrainCell } from "@/types/battle";

export type { BattleMapActions, BattleMapView };

export interface BattleMapProps {
  map: BattleMapConfig;
  participants: BattleParticipant[];
  view?: BattleMapView;
  actions?: BattleMapActions;
  className?: string;
  editing?: BattleMapEditing;
  /** телефон: карта обрізана до ігрових клітинок, на всю ширину й вертикально, якщо вона альбомна */
  phone?: boolean;
}

export interface BattleMapEditing {
  clickableBlocked?: boolean;
  showBlocked?: boolean;
  strokeTool?: boolean;
}

const HATCH_ID = "battle-map-barrier-hatch";

const HAZARD_GRADIENT_ID = "battle-map-hazard-fire";

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

function hazardTitle(t: TerrainCell, round: number | undefined): string {
  const label = t.label ?? DEFAULT_HAZARD_LABEL;

  if (t.untilRound === undefined) return label;

  return round === undefined ? `${label} · до кінця раунду ${t.untilRound}` : `${label} · ще ${Math.max(1, t.untilRound - round + 1)} р.`;
}

function terrainTitle(t: TerrainCell, round: number | undefined): string | null {
  if (t.kind === "barrier") return `Барʼєр${t.untilRound !== undefined ? ` до кінця раунду ${t.untilRound}` : ""}`;

  return t.kind === "hazard" ? hazardTitle(t, round) : null;
}

const TERRAIN_FILL = { wall: "rgba(0,0,0,.6)", barrier: "rgba(0,0,0,.75)", hazard: `url(#${HAZARD_GRADIENT_ID})` } as const;

const FLAME = UNIT * 0.42;

/** Жар і полум'я поверх небезпечних клітинок; на повернутій телефонній карті гліфи стоять прямо. */
const HazardLayer = memo(function HazardLayer({ cells, rotated }: { cells: GridPoint[]; rotated: boolean }) {
  if (cells.length === 0) return null;

  return (
    <g pointerEvents="none" data-hazard-layer="">
      <g className="battle-map-ember">
        {cells.map((p) => (
          <polygon key={`e${cellKey(p)}`} points={cellPolygon(p)} fill="rgba(255,190,70,.3)" stroke="#ffc35a" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      <g className="battle-map-flame">
        {cells.map((p) => {
          const c = cellCenter(p);

          return (
            <g key={`f${cellKey(p)}`} data-hazard-flame={cellKey(p)} transform={rotated ? `rotate(-90 ${c.x} ${c.y})` : undefined}>
              <Flame x={c.x - FLAME / 2} y={c.y - FLAME / 2} width={FLAME} height={FLAME} color="#ffe08a" fill="rgba(255,120,30,.85)" strokeWidth={1.6} />
            </g>
          );
        })}
      </g>
    </g>
  );
});

interface GridLayerProps {
  map: BattleMapConfig;
  marks: BattleMapView["marks"];
  actions?: BattleMapActions;
  wasDragged: () => boolean;
  clickableBlocked?: boolean;
  showBlocked?: boolean;
  onStrokeStart?: (p: GridPoint, e: PointerEvent) => void;
  scene: { round?: number; rotated: boolean };
}

const GridLayer = memo(function GridLayer({ map, marks, actions, wasDragged, clickableBlocked, showBlocked, onStrokeStart, scene }: GridLayerProps) {
  const cells = useMemo(() => {
    const list: GridPoint[] = [];

    for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) list.push({ x, y });

    return list;
  }, [map.cols, map.rows]);

  const blocked = useMemo(() => blockedSet({ blocked: map.blocked }), [map.blocked]);

  const terrain = map.terrain;

  const terrainCells = useMemo(
    () => cells.flatMap((p) => (terrain?.[cellKey(p)] && !blocked.has(cellKey(p)) ? [{ p, cell: terrain[cellKey(p)] }] : [])),
    [cells, terrain, blocked],
  );

  const hazardCells = useMemo(() => terrainCells.flatMap(({ p, cell }) => (cell.kind === "hazard" ? [p] : [])), [terrainCells]);

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
        <radialGradient id={HAZARD_GRADIENT_ID}>
          <stop offset="0%" stopColor="#ffd36b" stopOpacity={0.75} />
          <stop offset="55%" stopColor="#ff7a1a" stopOpacity={0.62} />
          <stop offset="100%" stopColor="#b8200f" stopOpacity={0.7} />
        </radialGradient>
      </defs>
      {terrainCells.map(({ p, cell }) => {
        const hazard = cell.kind === "hazard";

        return (
          <g key={`t${cellKey(p)}`} data-terrain={cell.kind} data-hazard-timed={hazard && cell.untilRound !== undefined ? "" : undefined} pointerEvents="none">
            <polygon points={cellPolygon(p)} fill={TERRAIN_FILL[cell.kind]} stroke={hazard ? "#ff9a2a" : "none"} strokeOpacity={0.9} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            {cell.kind === "barrier" && <polygon points={cellPolygon(p)} fill={`url(#${HATCH_ID})`} stroke="none" />}
          </g>
        );
      })}
      <HazardLayer cells={hazardCells} rotated={scene.rotated} />
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
              onClick={clickableBlocked && !onStrokeStart ? () => !wasDragged() && actions?.onCellClick?.(p) : undefined}
              onPointerDown={onStrokeStart ? (e) => onStrokeStart(p, e) : undefined}
            />
          );
        }

        const mark = marks?.get(key);

        const cell = terrain?.[key];

        const title = cell && terrainTitle(cell, scene.round);

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
            style={{ cursor: onStrokeStart ? "crosshair" : actions?.onCellClick ? "pointer" : undefined }}
            onClick={onStrokeStart ? undefined : () => !wasDragged() && actions?.onCellClick?.(p)}
            onPointerDown={onStrokeStart ? (e) => onStrokeStart(p, e) : undefined}
            onPointerEnter={onStrokeStart ? undefined : () => actions?.onCellHover?.(p)}
          >
            {title && <title>{title}</title>}
          </polygon>
        );
      })}
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

const parseKey = (key: string): GridPoint => {
  const [x, y] = key.split(":").map(Number);

  return { x, y };
};

const StrokeLayer = memo(function StrokeLayer({ preview, pending }: { preview: ReadonlySet<string>; pending?: ReadonlySet<string> }) {
  const sent = pending ? [...pending].filter((k) => !preview.has(k)) : [];

  return (
    <g pointerEvents="none">
      {sent.map((k) => (
        <polygon key={`p${k}`} data-stroke-pending={k} points={cellPolygon(parseKey(k))} fill="rgba(242,193,78,.22)" stroke="#f2c14e" strokeOpacity={0.6} strokeWidth={1.5} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
      ))}
      {[...preview].map((k) => (
        <polygon key={`s${k}`} data-stroke={k} points={cellPolygon(parseKey(k))} fill="rgba(242,193,78,.35)" stroke="#f2c14e" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      ))}
    </g>
  );
});

const PULSE_STEP_MS = 130;

const pulseStep = (from: GridPoint | null | undefined, p: GridPoint) => (from ? cellDistance(from, p) : 0);

/** Хвиля від центру (або вершини конуса/лінії) до країв: затримка анімації росте з відстанню клітинки. */
const TemplateLayer = memo(function TemplateLayer({ marks, aim, pulseFrom }: Pick<BattleMapView, "marks" | "aim" | "pulseFrom">) {
  const cells = marks ? [...marks].flatMap(([k, m]) => (m === "template" ? [k] : [])) : [];

  if (cells.length === 0 && !aim) return null;

  const pulse = (p: GridPoint) => {
    const step = pulseStep(pulseFrom, p);

    return { "data-pulse-step": step, className: "battle-map-pulse", style: { animationDelay: `${step * PULSE_STEP_MS}ms` } };
  };

  const wave = `${pulseFrom ? cellKey(pulseFrom) : ""}/${aim ? cellKey(aim) : ""}`;

  // новий ключ при зміні точки перезапускає анімацію всіх клітинок разом, а не лише нових
  return (
    <g key={wave} data-template-layer={wave} pointerEvents="none">
      {cells.map((k) => (
        <polygon key={`tp${k}`} data-template-cell={k} {...pulse(parseKey(k))} points={cellPolygon(parseKey(k))} fill="rgba(168,120,255,.3)" stroke="#c4a6ff" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      ))}
      {aim && <polygon data-template-aim={cellKey(aim)} {...pulse(aim)} points={cellPolygon(aim)} fill="rgba(200,176,255,.5)" stroke="#efe6ff" strokeWidth={3} vectorEffect="non-scaling-stroke" />}
    </g>
  );
});

const NO_CELLS: ReadonlySet<string> = new Set();

interface Stroke {
  pointerId: number;
  x: number;
  y: number;
  moved: boolean;
  last: GridPoint;
  cells: Map<string, GridPoint>;
}

export function BattleMap({ map, participants, view, actions, className, editing = {}, phone = false }: BattleMapProps) {
  const { clickableBlocked, showBlocked, strokeTool } = editing;

  const painting = Boolean(strokeTool && actions?.onStroke);

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

  const svgRef = useRef<SVGSVGElement>(null);

  const strokeRef = useRef<Stroke | null>(null);

  const [preview, setPreview] = useState<ReadonlySet<string>>(NO_CELLS);

  const onStrokeStart = useCallback((p: GridPoint, e: PointerEvent) => {
    if (!e.isPrimary || e.button !== 0) return;

    strokeRef.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, moved: false, last: p, cells: new Map([[cellKey(p), p]]) };
    setPreview(new Set([cellKey(p)]));
  }, []);

  const onStroke = actions?.onStroke;

  useEffect(() => {
    if (!painting) return;

    const drop = () => {
      strokeRef.current = null;
      setPreview(NO_CELLS);
    };

    const onMove = (e: globalThis.PointerEvent) => {
      const s = strokeRef.current;

      const svg = svgRef.current;

      if (!s || !svg || e.pointerId !== s.pointerId) return;

      // дрібне тремтіння клацання не має зачіпати сусідню клітинку
      if (!s.moved && Math.hypot(e.clientX - s.x, e.clientY - s.y) <= DRAG_THRESHOLD) return;

      s.moved = true;

      const ctm = svg.getScreenCTM();

      const cell = ctm && cellAtScreenPoint({ cols, rows }, ctm, e.clientX, e.clientY);

      if (!cell || (cell.x === s.last.x && cell.y === s.last.y)) return;

      for (const c of cellLine(s.last, cell)) s.cells.set(cellKey(c), c);

      s.last = cell;
      setPreview(new Set(s.cells.keys()));
    };

    // другий палець — це щипок, а не штрих
    const onDown = (e: globalThis.PointerEvent) => {
      if (strokeRef.current && e.pointerId !== strokeRef.current.pointerId) drop();
    };

    const onUp = (e: globalThis.PointerEvent) => {
      const s = strokeRef.current;

      if (!s || e.pointerId !== s.pointerId) return;

      drop();
      onStroke?.([...s.cells.values()]);
    };

    const onCancel = (e: globalThis.PointerEvent) => {
      if (strokeRef.current?.pointerId === e.pointerId) drop();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      drop();
    };
  }, [painting, onStroke, cols, rows]);

  const win = useMemo(() => (phone ? playableBounds(map) : { x: 0, y: 0, cols, rows }), [phone, map, cols, rows]);

  const fit = fitMapView(avail, win, { rotatable: phone, fillWidth: phone });

  const scrolls = phone && fit.height > avail.height + 0.5;

  const { zoom, offset, bind, containerRef, wasDragged } = useMapViewport({ panLocked: painting, wheelScrolls: scrolls });

  const pxPerUnit = (fit.rotated ? fit.height : fit.width) / (win.cols * UNIT);

  const round = view?.round;

  const gridScene = useMemo(() => ({ round, rotated: fit.rotated }), [round, fit.rotated]);

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

  const onCellHover = actions?.onCellHover;

  // портрет перехоплює вказівник, тож клітинка під ним не отримує pointerenter
  const onTokenHover = useCallback(
    (id: string | null) => {
      const token = id ? tokens.find((t) => t.p.basicInfo.id === id) : undefined;

      onCellHover?.(token ? centreCell(token.p) : null);
    },
    [tokens, onCellHover],
  );

  const movingId = view?.currentId && view.marks && [...view.marks.values()].some((m) => isMoveMark(m)) ? view.currentId : null;

  const trajectory = view?.trajectory ?? null;

  const from = trajectory?.kind === "ranged" ? tokens.find((t) => t.p.basicInfo.id === trajectory.fromId) : undefined;

  const end = trajectory?.kind === "ranged" ? cellCenter(trajectory.to) : null;

  const currentId = view?.currentId ?? null;

  useEffect(() => {
    const outer = outerRef.current;

    if (!phone || !currentId || !outer || outer.scrollHeight <= outer.clientHeight) return;

    const token = [...(containerRef.current?.querySelectorAll<HTMLElement>('[data-fx-anchor="map"]') ?? [])].find((el) => el.dataset.fxParticipant === currentId);

    if (!token) return;

    const t = token.getBoundingClientRect();

    const o = outer.getBoundingClientRect();

    const dy = t.top < o.top ? t.top - o.top : t.bottom > o.bottom ? t.bottom - o.bottom : 0;

    if (dy !== 0) outer.scrollBy({ top: dy, behavior: "smooth" });
    // scrolls — щоб спрацювати й після першого виміру, коли вкладку відкрили посеред ходу
  }, [phone, currentId, containerRef, scrolls]);

  // свайп угору-вниз віддаємо браузеру лише для прокрутки; зум, щипок і штрих місцевості — наші
  const touch = phone && scrolls && zoom === 1 && !painting ? "touch-pan-y" : "touch-none";

  const bgPx = Math.ceil(size.width * pxPerUnit);

  return (
    // висока карта на телефоні прокручується свайпом угору-вниз; по центру вона обрізала б верх без прокрутки; смуга прокрутки з резервом, щоб ширина не стрибала
    <div ref={outerRef} className={cn("flex h-full w-full justify-center", phone && "overflow-y-auto [scrollbar-gutter:stable]", scrolls ? "items-start" : "items-center", className)}>
    <div
      ref={containerRef}
      data-fx-clip
      data-attack-cursor={trajectory?.kind}
      className={cn(
        "relative shrink-0 select-none overflow-hidden bg-black",
        touch,
        !phone && "rounded-xl border border-white/10",
        // курсор-зброя має перебити інлайн cursor: pointer на клітинках і токенах
        trajectory && "cursor-(--attack-cursor)! **:cursor-(--attack-cursor)!",
      )}
      style={{ width: fit.width, height: fit.height, ...(trajectory && { "--attack-cursor": ATTACK_CURSOR[trajectory.kind] }) }}
      {...bind}
    >
      <div className="absolute inset-0 origin-top-left" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}>
      {/* поворот усередині шару зуму, тож панорама й щипок лишаються в екранних координатах */}
      <div
        data-map-rotated={fit.rotated || undefined}
        className={cn("absolute left-0 top-0 origin-top-left", !fit.rotated && "inset-0")}
        style={fit.rotated ? { width: fit.height, height: fit.width, transform: `translateX(${fit.width}px) rotate(90deg)` } : undefined}
      >
      <div
        className="absolute"
        style={{ left: -win.x * UNIT * pxPerUnit, top: -win.y * UNIT * pxPerUnit, width: size.width * pxPerUnit, height: size.height * pxPerUnit }}
      >
        <Image src={map.background ?? DEFAULT_MAP_BACKGROUND} alt="" fill sizes={phone && bgPx > 0 ? `${bgPx}px` : "100vw"} className="object-cover" priority />
        <svg ref={svgRef} className="absolute inset-0 h-full w-full" viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="none">
          <GridLayer
            map={map}
            marks={view?.marks}
            actions={actions}
            wasDragged={wasDragged}
            clickableBlocked={clickableBlocked}
            showBlocked={showBlocked}
            onStrokeStart={painting ? onStrokeStart : undefined}
            scene={gridScene}
          />
          <TemplateLayer marks={view?.marks} aim={view?.aim} pulseFrom={view?.pulseFrom} />
          {painting && <StrokeLayer preview={preview} pending={view?.pendingStroke} />}
          {from && end && (
            <g pointerEvents="none">
              <line data-map-attack-hint="ranged" x1={from.box.cx} y1={from.box.cy} x2={end.x} y2={end.y} stroke="#f2c14e" strokeWidth={4} strokeDasharray="12 10" vectorEffect="non-scaling-stroke" pointerEvents="none" />
              <circle cx={end.x} cy={end.y} r={UNIT * 0.18} fill="#f2c14e" />
            </g>
          )}
        </svg>
        {/* у режимі місцевості токени притушені, щоб під ними було видно штрих і заливку */}
        <div data-map-tokens className={cn(fit.rotated && "*:-rotate-90")} style={painting ? { opacity: 0.35 } : undefined}>
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
            onHover={painting || !onCellHover ? undefined : onTokenHover}
            passThrough={painting || movingId === p.basicInfo.id}
            impact={view?.impactFor?.(p.basicInfo.id)}
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
              impact={view?.impactFor?.(id)}
            />
          );
        })}
        </div>
      </div>
      </div>
      </div>
    </div>
    </div>
  );
}
