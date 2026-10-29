"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { WeatherLayer } from "./weather/WeatherLayer";
import { ATTACK_CURSOR } from "./attack-cursors";
import { MapStage } from "./MapStage";

import "./battle-map.css";
import { modeUiOf } from "@/components/battle/modes";
import { type ModeTools, useScrollToCurrent, useStrokePaint } from "@/lib/hooks/battle";
import { useViewport } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";
import { fitMapView, mapSize, MIN_TAP_CELL_PX, playableBounds, UNIT } from "@/lib/utils/battle/grid";
import type { BattleMapActions, BattleMapConfig, BattleMapView, BattleParticipant } from "@/types/battle";

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
  /** інструменти ДМ активного режиму; null — жоден не активний */
  mode?: ModeTools | null;
}

const NO_EDITING: BattleMapEditing = {};

export function BattleMap({ map, participants, view, actions, className, editing = NO_EDITING, phone = false }: BattleMapProps) {
  const { clickableBlocked, showBlocked, strokeTool } = editing;

  const painting = Boolean(strokeTool && actions?.onStroke);

  const modeTools = editing.mode ?? null;

  const ui = modeUiOf(map);

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

  const { svgRef, preview, onStrokeStart } = useStrokePaint({ painting, dims: { cols, rows }, onStroke: actions?.onStroke });

  const win = useMemo(() => (phone ? playableBounds(map) : { x: 0, y: 0, cols, rows }), [phone, map, cols, rows]);

  const fit = fitMapView(avail, win, { rotatable: phone, fillWidth: phone, minCell: MIN_TAP_CELL_PX });

  const scrollsX = fit.width > avail.width + 0.5;

  const scrollsY = fit.height > avail.height + 0.5;

  const scrolls = scrollsX || scrollsY;

  const { zoom, offset, bind, containerRef, wasDragged } = useViewport({ panLocked: painting || !!modeTools?.panLocked, wheelScrolls: scrolls });

  const pxPerUnit = (fit.rotated ? fit.height : fit.width) / (win.cols * UNIT);

  const modeView = view?.mode;

  const trajectory = view?.trajectory ?? null;

  useScrollToCurrent(outerRef, containerRef, view?.currentId ?? null, scrolls);

  const layout = useMemo(() => ({ win, size, pxPerUnit, rotated: fit.rotated, phone }), [win, size, pxPerUnit, fit.rotated, phone]);

  const interaction = useMemo(() => ({ painting, preview, svgRef, onStrokeStart, wasDragged }), [painting, preview, svgRef, onStrokeStart, wasDragged]);

  const stageEditing = useMemo(() => ({ clickableBlocked, showBlocked, mode: modeTools }), [clickableBlocked, showBlocked, modeTools]);

  // свайп віддаємо браузеру лише для прокрутки; зум, щипок і штрих місцевості — наші
  const touch = scrolls && zoom === 1 && !painting ? cn(scrollsX && "touch-pan-x", scrollsY && "touch-pan-y") : "touch-none";

  return (
    // карта, більша за екран, прокручується; по центру вона обрізала б край без прокрутки; смуга прокрутки з резервом, щоб ширина не стрибала
    <div
      ref={outerRef}
      className={cn("flex h-full w-full", (phone || scrolls) && "overflow-auto", phone && "[scrollbar-gutter:stable]", scrollsX ? "justify-start" : "justify-center", scrollsY ? "items-start" : "items-center", className)}
    >
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
        <MapStage map={map} participants={participants} view={view} actions={actions} editing={stageEditing} layout={layout} interaction={interaction} />
      </div>
      </div>
      {ui?.MapOverlay && <ui.MapOverlay view={modeView ?? null} participants={participants} />}
      <WeatherLayer weather={map.weather} phone={phone} />
    </div>
    </div>
  );
}
