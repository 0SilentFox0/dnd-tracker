import { z } from "zod";

import { defineTool } from "./define";

import "server-only";
import { readLegacyBattleState } from "@/lib/server/battles/read-service";

export const getBattleStateTool = defineTool({
  name: "get_battle_state",
  scopes: ["ai"],
  title: "Battle state",
  description: "State of a battle (the active one when battleId is omitted): round, turn order, participants with side, HP, AC, status, and the last events.",
  input: z.object({ battleId: z.string().min(1).optional() }),
  handler: (ctx, { battleId }) => readLegacyBattleState(ctx, battleId),
});
