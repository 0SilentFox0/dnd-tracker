import { createRefreshSourcesMutation, refreshSourcesSchema } from "./refresh-sources-mutation";

import { BattleStatus } from "@/lib/constants/battle";
import { BattleAccess, runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";

const mutate = createRefreshSourcesMutation();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  return runBattleMutation(req, {
    params: await params,
    access: BattleAccess.DM,
    requireStatus: BattleStatus.ACTIVE,
    allowWhileAwaitingDm: true,
    schema: refreshSourcesSchema,
    mutate,
  });
}
