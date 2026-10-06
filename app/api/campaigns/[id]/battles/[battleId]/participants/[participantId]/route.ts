import { patchParticipantMutation } from "./patch-participant-mutation";
import { patchParticipantSchema } from "./patch-participant-schema";

import { BattleAccess, runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; battleId: string; participantId: string }> },
) {
  const { id, battleId, participantId } = await params;

  return runBattleMutation(req, {
    params: { id, battleId },
    access: BattleAccess.DM,
    requireStatus: "active",
    rateLimitScope: "participantPatch",
    schema: patchParticipantSchema,
    mutate: (ctx, body) => patchParticipantMutation(ctx, participantId, body),
  });
}
