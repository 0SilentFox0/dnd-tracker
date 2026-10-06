import { bonusActionMutation, bonusActionSchema } from "./bonus-action-mutation";

import { BattleAccess, runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  return runBattleMutation(req, {
    params: await params,
    access: BattleAccess.MEMBER,
    requireStatus: "active",
    rateLimitScope: "bonusAction",
    schema: bonusActionSchema,
    respond: "wrapped",
    mutate: bonusActionMutation,
  });
}
