import { z } from "zod";

import { ParticipantSide } from "@/lib/constants/battle";
import { mapCellSchema } from "@/lib/schemas/battles";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import { cellKey, inBounds } from "@/lib/utils/battle/grid/geometry";
import {
  allReachExit,
  generateMaze,
  inwardFacing,
  isEdgeCell,
  MAZE_EXIT_ERROR,
  MAZE_SCATTER_ERROR,
  mazeAwareness,
  mulberry32,
  reshuffleMaze,
  scatterStarts,
  seedFrom,
} from "@/lib/utils/battle/maze";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleRuleError } from "@/lib/utils/battle/store";
import type { BattleParticipant, GridPoint, MazeConfig } from "@/types/battle";

const edgeKeySchema = z.string().regex(/^\d+:\d+:[es]$/);

const cellKeySchema = z.string().regex(/^\d+:\d+$/);

const features = { teleportPairs: z.number().int().min(0).max(10), fogPatches: z.number().int().min(0).max(20) };

export const mazeActionSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("generate"), difficulty: z.enum(["easy", "medium", "hard"]), ...features, exit: mapCellSchema.nullable() }),
  z.object({ op: z.literal("reshuffle"), mode: z.enum(["walls", "scatter"]), ...features }),
  z.object({ op: z.literal("walls"), add: z.array(edgeKeySchema).max(400), remove: z.array(edgeKeySchema).max(400) }),
  z.object({ op: z.literal("exit"), cell: mapCellSchema }),
  z.object({ op: z.literal("teleport"), pair: z.tuple([mapCellSchema, mapCellSchema]).nullable(), removeAt: mapCellSchema.optional() }),
  z.object({ op: z.literal("fog"), cells: z.array(cellKeySchema).max(400), on: z.boolean() }),
  z.object({ op: z.literal("dark"), on: z.boolean() }),
  z.object({ op: z.literal("scatterStarts") }),
]);

export type MazeAction = z.infer<typeof mazeActionSchema>;

type OpHandler<K extends MazeAction["op"]> = (ctx: BattleMutationContext, maze: MazeConfig, body: Extract<MazeAction, { op: K }>) => MutationResult;

const MOVED_ERROR = "Лабіринт уже пройдено частково — використайте «Перетасувати»";

const WALLED_IN_ERROR = "Ці стіни замурують учасника — шляху до виходу не залишиться";

const reject = (message: string): never => {
  throw new BattleRuleError("action_rejected", message);
};

const onField = (p: BattleParticipant) => p.battleData.position !== undefined && !p.battleData.reserved && !p.battleData.escaped && isActive(p);

const isHero = (p: BattleParticipant) => p.basicInfo.side === ParticipantSide.ALLY;

const positionsOf = (participants: BattleParticipant[]) => participants.filter(onField).map((p) => p.battleData.position as GridPoint);

const parts = (key: string) => key.split(":");

function canonicalEdge(key: string, grid: { cols: number; rows: number }): string {
  const [x, y, dir] = parts(key);

  const a = { x: Number(x), y: Number(y) };

  const b = dir === "e" ? { x: a.x + 1, y: a.y } : { x: a.x, y: a.y + 1 };

  if (!inBounds(grid, a) || !inBounds(grid, b)) return reject("Ребро поза картою");

  return `${cellKey(a)}:${dir}`;
}

function canonicalCell(key: string, grid: { cols: number; rows: number }): string {
  const [x, y] = parts(key);

  const cell = { x: Number(x), y: Number(y) };

  return inBounds(grid, cell) ? cellKey(cell) : reject("Клітинка поза картою");
}

function finish(ctx: BattleMutationContext, maze: MazeConfig, extra: Partial<MutationResult> = {}): MutationResult {
  const map = ctx.meta.map as NonNullable<typeof ctx.meta.map>;

  return { participants: ctx.participants, pending: ctx.pending, events: [], scene: { map: { ...map, maze } }, ...extra };
}

const gridOf = (ctx: BattleMutationContext, maze: MazeConfig) => {
  const map = ctx.meta.map as NonNullable<typeof ctx.meta.map>;

  return { cols: map.cols, rows: map.rows, maze };
};

const seedOf = (ctx: BattleMutationContext) => seedFrom(ctx.rng ?? Math.random);

function assertReachable(ctx: BattleMutationContext, maze: MazeConfig) {
  if (!allReachExit(gridOf(ctx, maze), positionsOf(ctx.participants))) reject(WALLED_IN_ERROR);
}

function withPositions(participants: BattleParticipant[], positions: Record<string, GridPoint>, grid: { cols: number; rows: number }): BattleParticipant[] {
  return participants.map((p) => {
    const position = positions[p.basicInfo.id];

    if (!position) return p;

    return { ...p, battleData: { ...p.battleData, position, ...(isHero(p) && { facing: inwardFacing(grid, position) }) } };
  });
}

const generate: OpHandler<"generate"> = (ctx, maze, body) => {
  if (maze.moved) reject(MOVED_ERROR);

  const grid = gridOf(ctx, { ...maze, exit: body.exit });

  const heroes = ctx.participants.filter((p) => isHero(p) && !p.battleData.reserved && !p.battleData.escaped && isActive(p));

  const edgeHeroes = heroes.every((h) => h.battleData.position && isEdgeCell(grid, h.battleData.position));

  const rnd = mulberry32(seedOf(ctx));

  const scattered = edgeHeroes ? {} : scatterStarts(grid, heroes.map((h) => h.basicInfo.id), rnd);

  if (!scattered) return reject(MAZE_SCATTER_ERROR);

  const participants = edgeHeroes ? ctx.participants : withPositions(ctx.participants, scattered, grid);

  const heroIds = new Set(heroes.map((h) => h.basicInfo.id));

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

  if ("error" in generated) return reject(generated.error);

  return finish({ ...ctx, participants }, { ...generated, dark: maze.dark, marks: {} }, { participants });
};

const reshuffle: OpHandler<"reshuffle"> = (ctx, maze, body) => {
  const grid = gridOf(ctx, maze);

  const field = ctx.participants.filter(onField);

  const result = reshuffleMaze({
    grid,
    maze,
    mode: body.mode,
    participantIds: field.map((p) => p.basicInfo.id),
    positions: Object.fromEntries(field.map((p) => [p.basicInfo.id, p.battleData.position as GridPoint])),
    teleportPairs: body.teleportPairs,
    fogPatches: body.fogPatches,
    seed: seedOf(ctx),
  });

  if ("error" in result) return reject(result.error);

  const moved = body.mode === "scatter" ? withPositions(ctx.participants, result.positions, grid) : ctx.participants;

  const awareness = mazeAwareness({ ...grid, maze: result.maze }, { participants: moved, round: ctx.scene.round, sleep: true });

  return finish(ctx, result.maze, { participants: awareness.participants, events: awareness.events });
};

const walls: OpHandler<"walls"> = (ctx, maze, body) => {
  const grid = gridOf(ctx, maze);

  const next = new Set(maze.walls);

  for (const key of body.remove) next.delete(canonicalEdge(key, grid));

  for (const key of body.add) next.add(canonicalEdge(key, grid));

  const updated = { ...maze, walls: [...next].sort() };

  assertReachable(ctx, updated);

  return finish(ctx, updated);
};

const exit: OpHandler<"exit"> = (ctx, maze, body) => {
  const grid = gridOf(ctx, maze);

  if (!inBounds(grid, body.cell) || !isEdgeCell(grid, body.cell)) reject(MAZE_EXIT_ERROR);

  const updated = { ...maze, exit: body.cell };

  assertReachable(ctx, updated);

  return finish(ctx, updated);
};

const teleport: OpHandler<"teleport"> = (ctx, maze, body) => {
  const grid = gridOf(ctx, maze);

  let teleports = maze.teleports;

  if (body.removeAt) {
    const at = cellKey(body.removeAt);

    teleports = teleports.filter((pair) => !pair.some((c) => cellKey(c) === at));
  }

  if (body.pair) {
    const keys = body.pair.map(cellKey);

    const taken = new Set([...teleports.flat().map(cellKey), ...(maze.exit ? [cellKey(maze.exit)] : [])]);

    if (!body.pair.every((c) => inBounds(grid, c)) || keys[0] === keys[1] || keys.some((k) => taken.has(k))) reject("Телепорт не можна поставити сюди");

    teleports = [...teleports, body.pair];
  } else if (!body.removeAt) {
    reject("Вкажіть телепорт для видалення");
  }

  return finish(ctx, { ...maze, teleports });
};

const fog: OpHandler<"fog"> = (ctx, maze, body) => {
  const grid = gridOf(ctx, maze);

  const next = new Set(maze.fog);

  for (const key of body.cells) {
    const cell = canonicalCell(key, grid);

    if (body.on) next.add(cell);
    else next.delete(cell);
  }

  return finish(ctx, { ...maze, fog: [...next] });
};

const dark: OpHandler<"dark"> = (ctx, maze, body) => finish(ctx, { ...maze, dark: body.on });

const scatterStartsOp: OpHandler<"scatterStarts"> = (ctx, maze) => {
  if (maze.moved) reject(MOVED_ERROR);

  const grid = gridOf(ctx, maze);

  const heroes = ctx.participants.filter((p) => isHero(p) && !p.battleData.reserved && !p.battleData.escaped && isActive(p));

  const others = ctx.participants.filter((p) => !heroes.includes(p));

  const rnd = mulberry32(seedOf(ctx));

  const ids = heroes.map((h) => h.basicInfo.id);

  for (let attempt = 0; attempt < 20; attempt++) {
    const starts = scatterStarts(grid, ids, rnd);

    if (!starts) return reject(MAZE_SCATTER_ERROR);

    const taken = new Set(positionsOf(others).map(cellKey));

    if (Object.values(starts).some((c) => taken.has(cellKey(c)))) continue;

    const participants = withPositions(ctx.participants, starts, grid);

    if (!allReachExit(grid, positionsOf(participants))) continue;

    return finish(ctx, maze, { participants });
  }

  return reject(WALLED_IN_ERROR);
};

export const MAZE_OPS: { [K in MazeAction["op"]]: OpHandler<K> } = {
  generate,
  reshuffle,
  walls,
  exit,
  teleport,
  fog,
  dark,
  scatterStarts: scatterStartsOp,
};
