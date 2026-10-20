import { MAZE_OPS, type MazeAction } from "./maze-ops";

import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleRuleError } from "@/lib/utils/battle/store";
import type { MazeConfig } from "@/types/battle";

export { type MazeAction, mazeActionSchema } from "./maze-ops";

export function mazeMutation(ctx: BattleMutationContext, body: MazeAction): MutationResult {
  const maze = ctx.meta.map?.maze;

  if (!maze) throw new BattleRuleError("action_rejected", "Цей бій не лабіринт");

  const handler = MAZE_OPS[body.op] as (ctx: BattleMutationContext, maze: MazeConfig, body: MazeAction) => MutationResult;

  return handler(ctx, maze, body);
}
