import { abilityActionMutation, abilityActionSchema } from "./ability-action-mutation";

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
    rateLimitScope: "abilityAction",
    schema: abilityActionSchema,
    respond: "wrapped",
    mutate: abilityActionMutation,
  });
}
