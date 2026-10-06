import { addParticipantSchema, createAddParticipantMutation } from "./add-participant-mutation";

import { BattleAccess, runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";

const mutate = createAddParticipantMutation();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  return runBattleMutation(req, {
    params: await params,
    access: BattleAccess.DM,
    requireStatus: "active",
    schema: addParticipantSchema,
    mutate,
  });
}
