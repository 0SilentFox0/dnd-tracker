import { createRollbackMutation, rollbackSchema } from "./rollback-mutation";

import { BattleAccess, runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";

const mutate = createRollbackMutation();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  return runBattleMutation(req, { params: await params, access: BattleAccess.DM, schema: rollbackSchema, mutate });
}
