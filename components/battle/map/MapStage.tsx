"use client";

import { memo, type PointerEvent, type RefObject, useCallback, useEffect, useMemo, useRef } from "react";

import { MapBackground } from "./MapBackground";
import { MapHitFloat } from "./MapHitFloat";
import { type GridCellActions, GridLayer, StrokeLayer, TemplateLayer } from "./MapLayers";
import { MapToken } from "./MapToken";
import { MapTokenHud } from "./MapTokenHud";
import { RangedHint } from "./RangedHint";
import { type MapPlacement } from "./token-box";

import { modeUiOf } from "@/components/battle/modes";
import { type ModeTools } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { isDormant, isEscaped } from "@/lib/utils/abilities/engine/core/participants";
import { centreCell, isFallen, isMoveMark, tokenBox, UNIT } from "@/lib/utils/battle/grid";
import type { BattleMapActions, BattleMapConfig, BattleMapView, BattleParticipant } from "@/types/battle";

export interface MapStageLayout {
  win: { x: number; y: number };
  size: { width: number; height: number };
  pxPerUnit: number;
  rotated: boolean;
  phone: boolean;
}

export interface MapStageInteraction {
  painting: boolean;
  preview: ReadonlySet<string>;
  svgRef: RefObject<SVGSVGElement | null>;
  onStrokeStart: (p: { x: number; y: number }, e: PointerEvent) => void;
  wasDragged: () => boolean;
}

export interface MapStageEditing {
  clickableBlocked?: boolean;
  showBlocked?: boolean;
  mode: ModeTools | null;
}

interface MapStageProps {
  map: BattleMapConfig;
  participants: BattleParticipant[];
  view?: BattleMapView;
  actions?: BattleMapActions;
  editing: MapStageEditing;
  layout: MapStageLayout;
  interaction: MapStageInteraction;
}

/** Шар карти в пікселях: фон, SVG-сітка й шари, жетони з HUD і числами ударів. */
function MapStageImpl({ map, participants, view, actions, editing, layout, interaction }: MapStageProps) {
  const { win, size, pxPerUnit, rotated, phone } = layout;

  const { painting, preview, svgRef, onStrokeStart, wasDragged } = interaction;

  const { clickableBlocked, showBlocked, mode: modeTools } = editing;

  const ui = modeUiOf(map);

  const modeView = view?.mode;

  const round = view?.round;

  const onTokenClickProp = actions?.onTokenClick;

  const onCellClick = actions?.onCellClick;

  const onCellHover = actions?.onCellHover;

  const gridScene = useMemo(() => ({ round, rotated, clickableBlocked, showBlocked }), [round, rotated, clickableBlocked, showBlocked]);

  const cellActions = useMemo<GridCellActions>(() => ({ onCellClick, onCellHover, wasDragged }), [onCellClick, onCellHover, wasDragged]);

  // полеглі лишаються тут: жетон зникає лише в момент удару анімації, а число смертельного удару — після
  const placed = useMemo(
    () =>
      participants
        .filter((p) => !p.battleData.reserved)
        .filter((p) => !modeView || (!isEscaped(p) && modeView.visibleIds.has(p.basicInfo.id)))
        .flatMap((p) => {
          const box = tokenBox(p);

          return box ? [{ p, box, placement: { box, mapSize: size, pxPerUnit } satisfies MapPlacement }] : [];
        }),
    [participants, modeView, size, pxPerUnit],
  );

  const tokens = useMemo(() => placed.filter(({ p }) => !isFallen(p)), [placed]);

  const tokenClickRef = useRef(onTokenClickProp);

  useEffect(() => {
    tokenClickRef.current = onTokenClickProp;
  }, [onTokenClickProp]);

  const onTokenClick = useCallback((id: string) => !wasDragged() && tokenClickRef.current?.(id), [wasDragged]);

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

  return (
    <div
      className="absolute"
      style={{ left: -win.x * UNIT * pxPerUnit, top: -win.y * UNIT * pxPerUnit, width: size.width * pxPerUnit, height: size.height * pxPerUnit }}
    >
      <MapBackground map={map} cellPx={UNIT * pxPerUnit} phone={phone} />
      <svg ref={svgRef} className="absolute inset-0 h-full w-full" viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="none">
        <GridLayer map={map} marks={view?.marks} cellActions={cellActions} onStrokeStart={painting ? onStrokeStart : undefined} scene={gridScene} />
        {ui?.MapLayers && <ui.MapLayers map={map} view={modeView ?? null} rotated={rotated} editing={modeTools?.toolActive ? modeTools.raw : null} />}
        <TemplateLayer marks={view?.marks} aim={view?.aim} pulseFrom={view?.pulseFrom} />
        {painting && <StrokeLayer preview={preview} pending={view?.pendingStroke} />}
        {from && trajectory && <RangedHint from={from.box} trajectory={trajectory} />}
      </svg>
      {/* у режимі місцевості токени притушені, щоб під ними було видно штрих і заливку */}
      <div data-map-tokens className={cn(rotated && "*:-rotate-90")} style={painting ? { opacity: 0.35 } : undefined}>
        {placed.map(({ p, placement }) => (
          <MapToken
            key={p.basicInfo.id}
            participant={p}
            placement={placement}
            selected={view?.selectedId === p.basicInfo.id}
            current={view?.currentId === p.basicInfo.id}
            onClick={onTokenClick}
            onHover={painting || !onCellHover ? undefined : onTokenHover}
            passThrough={painting || !!modeTools?.toolActive || movingId === p.basicInfo.id}
            impact={view?.impactFor?.(p.basicInfo.id)}
            effects={view?.effects?.get(p.basicInfo.id)}
            dormant={!!modeView?.showDormant && isDormant(p)}
          />
        ))}
        {placed.map(({ p, placement }) => {
          const id = p.basicInfo.id;

          const hud = view?.hud?.get(id);

          return (
            <MapTokenHud
              key={`hud:${id}`}
              participant={p}
              placement={placement}
              exact={hud?.exact ?? false}
              raised={view?.selectedId === id || view?.currentId === id}
              impact={view?.impactFor?.(id)}
              effects={view?.effects?.get(id)}
              onReturn={view?.returnId === id ? actions?.onReturn : undefined}
            />
          );
        })}
        {placed.map(({ p, placement }) => (
          <MapHitFloat key={`float:${p.basicInfo.id}`} participant={p} placement={placement} impact={view?.impactFor?.(p.basicInfo.id)} />
        ))}
      </div>
    </div>
  );
}

export const MapStage = memo(MapStageImpl);
