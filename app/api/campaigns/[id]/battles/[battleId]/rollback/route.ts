import { createRollbackMutation, rollbackSchema } from "./rollback-mutation";

import { runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";

const mutate = createRollbackMutation();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  return runBattleMutation(req, { params: await params, access: "dm", schema: rollbackSchema, mutate });
}
