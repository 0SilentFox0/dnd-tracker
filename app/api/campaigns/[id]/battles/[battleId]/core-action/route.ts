import { coreActionMutation } from "./core-action-mutation";

import { BattleStatus } from "@/lib/constants/battle";
import { coreActionSchema } from "@/lib/utils/battle/actions/schema";
import { BattleAccess, runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";

export async function POST(req: Request, { params }: { params: Promise<{ id: string; battleId: string }> }) {
  return runBattleMutation(req, {
    params: await params,
    access: BattleAccess.MEMBER,
    requireStatus: BattleStatus.ACTIVE,
    blockedByMode: true,
    schema: coreActionSchema,
    mutate: coreActionMutation,
  });
}
