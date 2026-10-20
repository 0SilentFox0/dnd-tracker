"use client";

import { memo, useId } from "react";

import { cellCenter, cellKey, parseCellKey, UNIT } from "@/lib/utils/battle/grid";
import { MazeView } from "@/lib/utils/battle/modes/maze";
import type { BattleMapConfig, GridPoint, MazeMark, MazeMarkSymbol } from "@/types/battle";

const RUNE = "M0,-30 L26,15 L-26,15 Z M0,30 L-26,-15 L26,-15 Z";

const ARROW = "M0,-20 L15,0 L5,0 L5,18 L-5,18 L-5,0 L-15,0 Z";

const STAR = "M0,-20 L5.9,-8.1 L19,-6.2 L9.5,3.1 L11.8,16.2 L0,10 L-11.8,16.2 L-9.5,3.1 L-19,-6.2 L-5.9,-8.1 Z";

const SKULL = "M-15,2 A15,15 0 1,1 15,2 V8 H8 V16 H-8 V8 H-15 Z M-7,-4 a4,4 0 1,0 0.1,0 Z M7,-4 a4,4 0 1,0 0.1,0 Z";

const CROSS = "M-14,-14 L14,14 M14,-14 L-14,14";

const GLYPHS: Record<MazeMarkSymbol, { d: string; turn?: number; stroke?: boolean }> = {
  "arrow-n": { d: ARROW, turn: 0 },
  "arrow-e": { d: ARROW, turn: 90 },
  "arrow-s": { d: ARROW, turn: 180 },
  "arrow-w": { d: ARROW, turn: 270 },
  cross: { d: CROSS, stroke: true },
  skull: { d: SKULL },
  star: { d: STAR },
};

function MarkGlyph({ cell, mark, rotated }: { cell: GridPoint; mark: MazeMark; rotated: boolean }) {
  const c = cellCenter(cell);

  const { d, turn, stroke } = GLYPHS[mark.symbol];

  // стрілка вказує сторону лабіринту, тож на повернутій карті крутиться разом із нею; решта символів стоїть прямо
  const angle = turn ?? (rotated ? -90 : 0);

  const transform = `translate(${c.x} ${c.y})${angle ? ` rotate(${angle})` : ""}`;

  return (
    <g data-maze-mark={cellKey(cell)} data-mark-symbol={mark.symbol} transform={transform} style={{ color: mark.color }} className="maze-mark">
      {stroke ? <path d={d} fill="none" stroke="currentColor" strokeWidth={7} strokeLinecap="round" /> : <path d={d} fill="currentColor" fillRule="evenodd" />}
    </g>
  );
}

const ARCH_STONE = "M-38,40 V-10 A38,38 0 0 1 38,-10 V40 H24 V-10 A24,24 0 0 0 -24,-10 V40 Z";

const ARCH_OPENING = "M-24,40 V-10 A24,24 0 0 1 24,-10 V40 Z";

const SWIRL = "M0,6 m-4,0 a4,4 0 1,1 8,0 a8,8 0 1,1 -16,0 a12,12 0 1,1 24,0 a16,16 0 1,1 -32,0";

interface Props {
  map: BattleMapConfig;
  view: MazeView | null | undefined;
  rotated: boolean;
}

export const MazeFeaturesLayer = memo(function MazeFeaturesLayer({ map, view, rotated }: Props) {
  const ids = useId().replace(/:/g, "");

  const maze = map.maze;

  if (!maze) return null;

  const visible = (key: string) => !view?.cells || view.cells.has(key);

  const fog = view && !view.showFog ? [] : maze.fog.filter(visible);

  const exit = maze.exit && (!view || view.showExit) && visible(cellKey(maze.exit)) ? maze.exit : null;

  const runes = maze.teleports.flatMap((pair) => pair.filter((p) => visible(cellKey(p))));

  const links = !view || view.showTeleportLinks ? maze.teleports : [];

  const marks = Object.entries(maze.marks).filter(([key]) => visible(key));

  const blurId = `maze-fog-${ids}`;

  const portalId = `maze-exit-${ids}`;

  const clipId = `maze-exit-clip-${ids}`;

  return (
    <g pointerEvents="none" data-maze-features="">
      <defs>
        <filter id={blurId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={UNIT * 0.12} />
        </filter>
        <radialGradient id={portalId} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="var(--maze-exit-core)" />
          <stop offset="55%" stopColor="var(--maze-exit-glow)" />
          <stop offset="100%" stopColor="var(--maze-exit-deep)" />
        </radialGradient>
        <clipPath id={clipId}>
          <path d={ARCH_OPENING} />
        </clipPath>
      </defs>
      <g filter={`url(#${blurId})`}>
        {fog.map((key) => {
          const p = parseCellKey(key);

          return <rect key={key} className="maze-fog" data-maze-fog={key} x={p.x * UNIT} y={p.y * UNIT} width={UNIT} height={UNIT} />;
        })}
      </g>
      {exit && (
        <g className="maze-exit" data-maze-exit={cellKey(exit)} transform={`translate(${cellCenter(exit).x} ${cellCenter(exit).y})${rotated ? " rotate(-90)" : ""}`}>
          <path d={ARCH_OPENING} fill={`url(#${portalId})`} />
          <g clipPath={`url(#${clipId})`}>
            <path className="maze-exit-swirl" d={SWIRL} fill="none" stroke="var(--maze-exit-core)" strokeWidth={3} strokeLinecap="round" opacity={0.85} />
          </g>
          <path d={ARCH_STONE} fill="var(--maze-arch-stone)" stroke="var(--maze-arch-edge)" strokeWidth={3} strokeLinejoin="round" />
        </g>
      )}
      {links.map(([a, b]) => {
        const [ca, cb] = [cellCenter(a), cellCenter(b)];

        return <line key={`l${cellKey(a)}`} className="maze-teleport-link" data-maze-link={`${cellKey(a)}>${cellKey(b)}`} x1={ca.x} y1={ca.y} x2={cb.x} y2={cb.y} strokeDasharray="14 12" />;
      })}
      {runes.map((p) => {
        const c = cellCenter(p);

        return (
          <g key={`r${cellKey(p)}`} data-maze-teleport={cellKey(p)} className="maze-teleport" transform={`translate(${c.x} ${c.y})`}>
            <circle r={UNIT * 0.36} fill="none" strokeWidth={4} />
            <path d={RUNE} fill="none" strokeWidth={4} strokeLinejoin="round" />
          </g>
        );
      })}
      {marks.map(([key, mark]) => (
        <MarkGlyph key={`m${key}`} cell={parseCellKey(key)} mark={mark} rotated={rotated} />
      ))}
    </g>
  );
});
