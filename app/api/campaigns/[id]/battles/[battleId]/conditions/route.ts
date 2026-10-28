import { battleConditionsMutation, battleConditionsSchema } from "./conditions-mutation";

import { BattleStatus } from "@/lib/constants/battle";
import { BattleAccess, runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";

export async function POST(req: Request, { params }: { params: Promise<{ id: string; battleId: string }> }) {
  return runBattleMutation(req, {
    params: await params,
    access: BattleAccess.DM,
    requireStatus: BattleStatus.ACTIVE,
    schema: battleConditionsSchema,
    mutate: battleConditionsMutation,
  });
}
