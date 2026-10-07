import { bonusActionMutation, bonusActionSchema } from "./bonus-action-mutation";

import { BattleStatus } from "@/lib/constants/battle";
import { BattleAccess, runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  return runBattleMutation(req, {
    params: await params,
    access: BattleAccess.MEMBER,
    requireStatus: BattleStatus.ACTIVE,
    rateLimitScope: "bonusAction",
    schema: bonusActionSchema,
    respond: "wrapped",
    mutate: bonusActionMutation,
  });
}
