import { MAZE_OPS, type MazeEnv } from "./maze-ops";

import { MAZE_TEXTS } from "@/lib/constants/maze-texts";
import { mazeActionSchema } from "@/lib/schemas/battles";
import { mazeGridOf } from "@/lib/utils/battle/maze";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { rejectAction } from "@/lib/utils/battle/store";
import type { MazeActionData } from "@/types/api";

export { mazeActionSchema };

export function mazeMutation(ctx: BattleMutationContext, body: MazeActionData): MutationResult {
  const map = ctx.meta.map;

  const grid = mazeGridOf(map);

  if (!map || !grid) return rejectAction(MAZE_TEXTS.notMaze);

  const handler = MAZE_OPS[body.op] as (ctx: BattleMutationContext, env: MazeEnv, body: MazeActionData) => MutationResult;

  return handler(ctx, { map, grid }, body);
}
