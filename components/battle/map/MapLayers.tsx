"use client";

import { memo, type PointerEvent, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Flame } from "lucide-react";

import { PULSE_STEP_MS } from "./constants";

import { blockedSet, cellCenter, cellDistance, cellKey, type CellMark, cellPolygon, isDamagingCell, isMoveMark, parseCellKey, UNIT } from "@/lib/utils/battle/grid";
import type { BattleMapActions, BattleMapConfig, BattleMapView, GridPoint, TerrainCell } from "@/types/battle";

const HATCH_ID = "battle-map-barrier-hatch";

const DIFFICULT_HATCH_ID = "battle-map-difficult-hatch";

const HAZARD_GRADIENT_ID = "battle-map-hazard-fire";

// приглушено: яскрава заливка перекривала фон карти; від недосяжних клітинок відрізняє контур
const ZONE = {
  move: { fill: "rgba(90,210,80,.07)", stroke: "rgba(140,255,110,.6)", glow: "rgba(125,255,90,.12)" },
  danger: { fill: "rgba(225,70,55,.09)", stroke: "rgba(255,100,85,.65)", glow: "rgba(255,90,74,.13)" },
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

  if (mark === "pick") return "rgba(110,170,255,.3)";

  if (mark === "picked") return "rgba(240,200,70,.5)";

  if (mark === "out-of-range") return "rgba(0,0,0,.45)";

  return mark === "invalid-target" ? "rgba(120,120,120,.25)" : "transparent";
}

type MapT = ReturnType<typeof useTranslations<"battle.map">>;

function hazardTitle(t: MapT, cell: TerrainCell, round: number | undefined): string {
  const label = cell.label ?? t("hazardDefault");

  if (cell.untilRound === undefined) return label;

  return round === undefined ? t("hazardUntilEnd", { label, round: cell.untilRound }) : t("hazardRoundsLeft", { label, rounds: Math.max(1, cell.untilRound - round + 1) });
}

function terrainTitle(t: MapT, cell: TerrainCell, round: number | undefined): string | null {
  if (cell.kind === "barrier") return cell.untilRound !== undefined ? t("barrierUntil", { round: cell.untilRound }) : t("barrier");

  if (cell.kind === "difficult") return cell.label ?? t("difficultDefault");

  return cell.kind === "hazard" ? hazardTitle(t, cell, round) : null;
}

const TERRAIN_FILL = { wall: "rgba(0,0,0,.6)", barrier: "rgba(0,0,0,.75)", difficult: "transparent", hazard: `url(#${HAZARD_GRADIENT_ID})` } as const;

const ZONE_FILL = "rgba(160,130,210,.16)";

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

export interface GridCellActions {
  onCellClick?: BattleMapActions["onCellClick"];
  onCellHover?: BattleMapActions["onCellHover"];
  wasDragged: () => boolean;
}

interface GridScene {
  round?: number;
  rotated: boolean;
  clickableBlocked?: boolean;
  showBlocked?: boolean;
}

interface GridLayerProps {
  map: BattleMapConfig;
  marks: BattleMapView["marks"];
  cellActions: GridCellActions;
  onStrokeStart?: (p: GridPoint, e: PointerEvent) => void;
  scene: GridScene;
}

export const GridLayer = memo(function GridLayer({ map, marks, cellActions, onStrokeStart, scene }: GridLayerProps) {
  const t = useTranslations("battle.map");

  const { onCellClick, onCellHover, wasDragged } = cellActions;

  const { clickableBlocked, showBlocked } = scene;

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

  const hazardCells = useMemo(() => terrainCells.flatMap(({ p, cell }) => (isDamagingCell(cell) ? [p] : [])), [terrainCells]);

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
        <pattern id={DIFFICULT_HATCH_ID} patternUnits="userSpaceOnUse" width={UNIT * 0.2} height={UNIT * 0.2} patternTransform="rotate(-45)">
          <line x1="0" y1="0" x2="0" y2={UNIT * 0.2} stroke="rgba(190,140,70,.7)" strokeWidth={UNIT * 0.035} />
        </pattern>
        <radialGradient id={HAZARD_GRADIENT_ID}>
          <stop offset="0%" stopColor="#ffd36b" stopOpacity={0.75} />
          <stop offset="55%" stopColor="#ff7a1a" stopOpacity={0.62} />
          <stop offset="100%" stopColor="#b8200f" stopOpacity={0.7} />
        </radialGradient>
      </defs>
      {terrainCells.map(({ p, cell }) => {
        const hazard = isDamagingCell(cell);

        return (
          <g key={`t${cellKey(p)}`} data-terrain={cell.kind} data-hazard-timed={hazard && cell.untilRound !== undefined ? "" : undefined} pointerEvents="none">
            <polygon points={cellPolygon(p)} fill={cell.kind === "hazard" && !hazard ? ZONE_FILL : TERRAIN_FILL[cell.kind]} stroke={hazard ? "#ff9a2a" : "none"} strokeOpacity={0.9} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            {cell.kind === "barrier" && <polygon points={cellPolygon(p)} fill={`url(#${HATCH_ID})`} stroke="none" />}
            {(cell.kind === "difficult" || cell.difficult) && <polygon points={cellPolygon(p)} fill={`url(#${DIFFICULT_HATCH_ID})`} stroke="none" data-difficult="" />}
            {cell.obscured && <polygon points={cellPolygon(p)} fill="rgba(210,215,225,.38)" stroke="none" data-obscured="" />}
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
              onClick={clickableBlocked && !onStrokeStart ? () => !wasDragged() && onCellClick?.(p) : undefined}
              onPointerDown={onStrokeStart ? (e) => onStrokeStart(p, e) : undefined}
            />
          );
        }

        const mark = marks?.get(key);

        const cell = terrain?.[key];

        const title = cell && terrainTitle(t, cell, scene.round);

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
            style={{ cursor: onStrokeStart ? "crosshair" : onCellClick ? "pointer" : undefined }}
            onClick={onStrokeStart ? undefined : () => !wasDragged() && onCellClick?.(p)}
            onPointerDown={onStrokeStart ? (e) => onStrokeStart(p, e) : undefined}
            onPointerEnter={onStrokeStart ? undefined : () => onCellHover?.(p)}
          >
            {title && <title>{title}</title>}
          </polygon>
        );
      })}
      <g pointerEvents="none">
        {zoneCells.map(({ p, zone }) => (
          <polygon key={`g${cellKey(p)}`} points={cellPolygon(p)} fill="none" stroke={zone.glow} strokeWidth={4} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        ))}
        {zoneCells.map(({ p, zone }) => (
          <polygon
            key={`z${cellKey(p)}`}
            data-fx-zone={zone === ZONE.danger ? "danger" : "move"}
            points={cellPolygon(p)}
            fill="none"
            stroke={zone.stroke}
            strokeWidth={1.5}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    </>
  );
});

export const StrokeLayer = memo(function StrokeLayer({ preview, pending }: { preview: ReadonlySet<string>; pending?: ReadonlySet<string> }) {
  const sent = pending ? [...pending].filter((k) => !preview.has(k)) : [];

  return (
    <g pointerEvents="none">
      {sent.map((k) => (
        <polygon key={`p${k}`} data-stroke-pending={k} points={cellPolygon(parseCellKey(k))} fill="rgba(242,193,78,.22)" stroke="#f2c14e" strokeOpacity={0.6} strokeWidth={1.5} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
      ))}
      {[...preview].map((k) => (
        <polygon key={`s${k}`} data-stroke={k} points={cellPolygon(parseCellKey(k))} fill="rgba(242,193,78,.35)" stroke="#f2c14e" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      ))}
    </g>
  );
});

const pulseStep = (from: GridPoint | null | undefined, p: GridPoint) => (from ? cellDistance(from, p) : 0);

/** Хвиля від центру (або вершини конуса/лінії) до країв: затримка анімації росте з відстанню клітинки. */
export const TemplateLayer = memo(function TemplateLayer({ marks, aim, pulseFrom }: Pick<BattleMapView, "marks" | "aim" | "pulseFrom">) {
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
        <polygon key={`tp${k}`} data-template-cell={k} {...pulse(parseCellKey(k))} points={cellPolygon(parseCellKey(k))} fill="rgba(168,120,255,.3)" stroke="#c4a6ff" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      ))}
      {aim && <polygon data-template-aim={cellKey(aim)} {...pulse(aim)} points={cellPolygon(aim)} fill="rgba(200,176,255,.5)" stroke="#efe6ff" strokeWidth={3} vectorEffect="non-scaling-stroke" />}
    </g>
  );
});
