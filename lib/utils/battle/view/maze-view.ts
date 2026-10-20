import type { QueueEntry } from "./queue";

import { ParticipantSide } from "@/lib/constants/battle";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import { cellKey } from "@/lib/utils/battle/grid/geometry";
import { inMazePlay, isEscaped, seesParticipant, unionVision, type Viewpoint, viewpointOf } from "@/lib/utils/battle/maze";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

export type MazeRole = "dm" | "player" | "spectator";

export interface MazeView {
  role: MazeRole;
  /** null — бачить усі клітинки */
  cells: ReadonlySet<string> | null;
  visibleIds: ReadonlySet<string>;
  /** Стіна на межі видимої клітинки (для гравця) */
  showWalls: (edge: string) => boolean;
  showTeleportLinks: boolean;
  showFog: boolean;
  showDormant: boolean;
  showExit: boolean;
  /** Для гравця: чорний екран зі своїм токеном */
  dark: boolean;
  mazeDark: boolean;
}

interface DeriveArgs {
  map: BattleMapConfig;
  participants: BattleParticipant[];
  userId: string;
  isDM: boolean;
  asHeroId?: string | null;
}

const always = () => true;

const edgeCells = (edge: string): string[] => {
  const [x, y, side] = edge.split(":");

  const nx = Number(x) + (side === "e" ? 1 : 0);

  const ny = Number(y) + (side === "s" ? 1 : 0);

  return [`${x}:${y}`, `${nx}:${ny}`];
};

const idOf = (p: BattleParticipant) => p.basicInfo.id;

const onField = (p: BattleParticipant) => p.battleData.position !== undefined;

const isLiveHero = (p: BattleParticipant) => p.basicInfo.side === ParticipantSide.ALLY && isActive(p) && !isEscaped(p) && onField(p);

export function deriveMazeView({ map, participants, userId, isDM, asHeroId }: DeriveArgs): MazeView | null {
  const maze = map.maze;

  if (!maze) return null;

  const grid = { cols: map.cols, rows: map.rows, maze };

  const base = { mazeDark: maze.dark };

  if (isDM && !asHeroId) {
    return { ...base, role: "dm", cells: null, visibleIds: new Set(participants.map(idOf)), showWalls: always, showTeleportLinks: true, showFog: true, showDormant: true, showExit: true, dark: false };
  }

  const own = participants.filter((p) => (isDM ? idOf(p) === asHeroId : p.basicInfo.controlledBy === userId) && isLiveHero(p));

  if (own.length === 0) {
    const visible = participants.filter((p) => onField(p) && (isLiveHero(p) || (p.basicInfo.side !== ParticipantSide.ALLY && inMazePlay(p))));

    return { ...base, role: "spectator", cells: null, visibleIds: new Set(visible.map(idOf)), showWalls: always, showTeleportLinks: false, showFog: false, showDormant: false, showExit: true, dark: false };
  }

  const viewers = own.map(viewpointOf).filter((v): v is Viewpoint => v !== null);

  const cells = unionVision(grid, viewers);

  const visibleIds = new Set(own.map(idOf));

  for (const p of participants) {
    if (visibleIds.has(idOf(p)) || !onField(p) || isEscaped(p) || !isActive(p)) continue;

    const target = p.battleData.position!;

    if (viewers.some((v) => seesParticipant(grid, cells, v.position, target))) visibleIds.add(idOf(p));
  }

  return {
    ...base,
    role: "player",
    cells,
    visibleIds,
    showWalls: (edge) => edgeCells(edge).some((c) => cells.has(c)),
    showTeleportLinks: false,
    showFog: true,
    showDormant: true,
    showExit: true,
    dark: maze.dark,
  };
}

export const filterQueue = (queue: QueueEntry[], view: MazeView): QueueEntry[] =>
  queue.filter((e) => e.kind === "round" || view.visibleIds.has(idOf(e.participant)));

export const mazeCellVisible = (view: MazeView, x: number, y: number): boolean => view.cells === null || view.cells.has(cellKey({ x, y }));
