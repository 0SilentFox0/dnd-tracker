import { resetMutation } from "./reset-mutation";

import { BattleAccess, runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  return runBattleMutation(req, { params: await params, access: BattleAccess.DM, mutate: resetMutation });
}
