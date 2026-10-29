import { tunnelMutation } from "./maze-tunnel";

import { ParticipantSide } from "@/lib/constants/battle";
import { cellKey, inBounds, parseCellKey } from "@/lib/utils/battle/grid/geometry";
import {
  allReachExit,
  featureKeys,
  generateMaze,
  type GridSize,
  inwardFacing,
  isEdgeCell,
  mazeAwareness,
  type MazeGrid,
  mazeHeroes,
  mulberry32,
  onMazeField,
  parseEdgeKey,
  reshuffleMaze,
  type Rng,
  scatterFreeStarts,
  seedFrom,
} from "@/lib/utils/battle/modes/maze";
import { MAZE_TEXTS } from "@/lib/utils/battle/modes/maze/texts";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { dmEvent, type NewBattleEvent, rejectAction } from "@/lib/utils/battle/store";
import { rngOf } from "@/lib/utils/common/rng";
import type { MazeActionData } from "@/types/api";
import type { BattleMapConfig, BattleParticipant, GridPoint, MazeConfig } from "@/types/battle";
import type { LogLine } from "@/types/text";

export interface MazeEnv {
  map: BattleMapConfig;
  grid: MazeGrid;
}

type OpHandler<K extends MazeActionData["op"]> = (ctx: BattleMutationContext, env: MazeEnv, body: Extract<MazeActionData, { op: K }>) => MutationResult;

const positionsOf = (participants: BattleParticipant[]): GridPoint[] => participants.filter(onMazeField).map((p) => p.battleData.position);

function canonicalEdge(key: string, grid: GridSize): string {
  const { a, b, side } = parseEdgeKey(key);

  if (!inBounds(grid, a) || !inBounds(grid, b)) return rejectAction(MAZE_TEXTS.edgeOutside);

  return `${cellKey(a)}:${side}`;
}

function canonicalCell(key: string, grid: GridSize): string {
  const cell = parseCellKey(key);

  return inBounds(grid, cell) ? cellKey(cell) : rejectAction(MAZE_TEXTS.cellOutside);
}

// подія потрібна, щоб зміну лабіринту можна було відкотити (знімок пишеться лише з подією)
export function mazeOpEvent(round: number, text: LogLine, kind: "op" | "reshuffle"): NewBattleEvent {
  const event = dmEvent(round, text);

  return { ...event, details: { ...event.details, actionDetails: { mazeEvent: kind } } };
}

interface FinishArgs {
  ctx: BattleMutationContext;
  map: BattleMapConfig;
  maze: MazeConfig;
  text: LogLine;
  kind?: "op" | "reshuffle";
  extra?: Partial<MutationResult>;
}

function finish({ ctx, map, maze, text, kind = "op", extra = {} }: FinishArgs): MutationResult {
  return { participants: ctx.participants, pending: ctx.pending, scene: { map: { ...map, maze } }, ...extra, events: [mazeOpEvent(ctx.scene.round, text, kind), ...(extra.events ?? [])] };
}

// правки пензлем ДМа йдуть часто: без події й знімка (відкат до попередньої дії поверне й ці правки)
function edited(ctx: BattleMutationContext, map: BattleMapConfig, maze: MazeConfig): MutationResult {
  return { participants: ctx.participants, pending: ctx.pending, scene: { map: { ...map, maze } }, events: [] };
}

const seedOf = (ctx: BattleMutationContext) => seedFrom(rngOf(ctx));

function assertReachable(ctx: BattleMutationContext, grid: MazeGrid) {
  if (!allReachExit(grid, positionsOf(ctx.participants))) rejectAction(MAZE_TEXTS.walledIn);
}

function withPositions(participants: BattleParticipant[], positions: Record<string, GridPoint>, grid: GridSize): BattleParticipant[] {
  return participants.map((p) => {
    const position = positions[p.basicInfo.id];

    if (!position) return p;

    return { ...p, battleData: { ...p.battleData, position, ...(p.basicInfo.side === ParticipantSide.ALLY && { facing: inwardFacing(grid, position) }) } };
  });
}

function heroStarts(ctx: BattleMutationContext, grid: MazeGrid, rnd: Rng, mustReachExit = false) {
  const heroes = mazeHeroes(ctx.participants);

  const heroIds = new Set(heroes.map((h) => h.basicInfo.id));

  const others = ctx.participants.filter((p) => !heroIds.has(p.basicInfo.id));

  const scatter = () => {
    const out = scatterFreeStarts(grid, { heroIds: [...heroIds], others: positionsOf(others), mustReachExit }, rnd);

    return "error" in out ? rejectAction(out.error) : out.starts;
  };

  return { heroes, heroIds, scatter };
}

const generate: OpHandler<"generate"> = (ctx, { map, grid: current }, body) => {
  if (current.maze.moved) rejectAction(MAZE_TEXTS.alreadyMoved);

  const grid = { ...current, maze: { ...current.maze, exit: body.exit } };

  const rnd = mulberry32(seedOf(ctx));

  const { heroes, heroIds, scatter } = heroStarts(ctx, grid, rnd);

  const edgeHeroes = heroes.every((h) => h.battleData.position && isEdgeCell(grid, h.battleData.position));

  const participants = edgeHeroes ? ctx.participants : withPositions(ctx.participants, scatter(), grid);

  const generated = generateMaze({
    grid,
    difficulty: body.difficulty,
    teleportPairs: body.teleportPairs,
    fogPatches: body.fogPatches,
    exit: body.exit,
    positions: positionsOf(participants.filter((p) => !heroIds.has(p.basicInfo.id))),
    starts: positionsOf(participants.filter((p) => heroIds.has(p.basicInfo.id))),
    seed: seedFrom(rnd),
  });

  if ("error" in generated) return rejectAction(generated.error);

  return finish({ ctx, map, maze: { ...generated, dark: current.maze.dark, marks: {} }, text: MAZE_TEXTS.ops.generate, extra: { participants } });
};

const reshuffle: OpHandler<"reshuffle"> = (ctx, env, body) => {
  if (body.mode === "tunnel") return tunnelMutation(ctx, env, mazeOpEvent(ctx.scene.round, MAZE_TEXTS.ops.tunnel, "reshuffle"));

  const { map, grid } = env;

  const field = ctx.participants.filter(onMazeField);

  const result = reshuffleMaze({
    grid,
    maze: grid.maze,
    mode: body.mode,
    participantIds: field.map((p) => p.basicInfo.id),
    positions: Object.fromEntries(field.map((p) => [p.basicInfo.id, p.battleData.position])),
    teleportPairs: body.teleportPairs,
    fogPatches: body.fogPatches,
    seed: seedOf(ctx),
  });

  if ("error" in result) return rejectAction(result.error);

  const moved = body.mode === "scatter" ? withPositions(ctx.participants, result.positions, grid) : ctx.participants;

  const awareness = mazeAwareness({ ...grid, maze: result.maze }, { participants: moved, round: ctx.scene.round, sleep: true });

  return finish({ ctx, map, maze: result.maze, text: MAZE_TEXTS.ops.reshuffle, kind: "reshuffle", extra: { participants: awareness.participants, events: awareness.events } });
};

const walls: OpHandler<"walls"> = (ctx, { map, grid }, body) => {
  const next = new Set(grid.maze.walls);

  for (const key of body.remove) next.delete(canonicalEdge(key, grid));

  for (const key of body.add) next.add(canonicalEdge(key, grid));

  const updated = { ...grid.maze, walls: [...next].sort() };

  assertReachable(ctx, { ...grid, maze: updated });

  return edited(ctx, map, updated);
};

const exit: OpHandler<"exit"> = (ctx, { map, grid }, body) => {
  if (!inBounds(grid, body.cell) || !isEdgeCell(grid, body.cell)) rejectAction(MAZE_TEXTS.exitOnEdge);

  if (grid.maze.teleports.flat().some((c) => cellKey(c) === cellKey(body.cell))) rejectAction(MAZE_TEXTS.exitOnTeleport);

  const updated = { ...grid.maze, exit: body.cell };

  assertReachable(ctx, { ...grid, maze: updated });

  return edited(ctx, map, updated);
};

const teleport: OpHandler<"teleport"> = (ctx, { map, grid }, body) => {
  let teleports = grid.maze.teleports;

  if (body.removeAt) {
    const at = cellKey(body.removeAt);

    teleports = teleports.filter((pair) => !pair.some((c) => cellKey(c) === at));
  }

  if (body.pair) {
    const keys = body.pair.map(cellKey);

    const taken = new Set([...featureKeys({ exit: grid.maze.exit, teleports }), ...positionsOf(ctx.participants).map(cellKey)]);

    if (!body.pair.every((c) => inBounds(grid, c)) || keys[0] === keys[1] || keys.some((k) => taken.has(k))) rejectAction(MAZE_TEXTS.teleportBlocked);

    teleports = [...teleports, body.pair];
  } else if (!body.removeAt) {
    rejectAction(MAZE_TEXTS.teleportMissing);
  }

  const updated = { ...grid.maze, teleports };

  assertReachable(ctx, { ...grid, maze: updated });

  return edited(ctx, map, updated);
};

const fog: OpHandler<"fog"> = (ctx, { map, grid }, body) => {
  const next = new Set(grid.maze.fog);

  for (const key of body.cells) {
    const cell = canonicalCell(key, grid);

    if (body.on) next.add(cell);
    else next.delete(cell);
  }

  return edited(ctx, map, { ...grid.maze, fog: [...next] });
};

const dark: OpHandler<"dark"> = (ctx, { map, grid }, body) =>
  finish({ ctx, map, maze: { ...grid.maze, dark: body.on }, text: body.on ? MAZE_TEXTS.ops.darkOn : MAZE_TEXTS.ops.darkOff });

const scatterStarts: OpHandler<"scatterStarts"> = (ctx, { map, grid }) => {
  if (grid.maze.moved) rejectAction(MAZE_TEXTS.alreadyMoved);

  const { scatter } = heroStarts(ctx, grid, mulberry32(seedOf(ctx)), true);

  return finish({ ctx, map, maze: grid.maze, text: MAZE_TEXTS.ops.scatterStarts, extra: { participants: withPositions(ctx.participants, scatter(), grid) } });
};

export const MAZE_OPS: { [K in MazeActionData["op"]]: OpHandler<K> } = { generate, reshuffle, walls, exit, teleport, fog, dark, scatterStarts };
