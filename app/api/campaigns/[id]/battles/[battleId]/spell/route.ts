import { spellSchema } from "./cast-spell-schema";
import { createSpellMutation } from "./spell-mutation";

import { BattleStatus } from "@/lib/constants/battle";
import { BattleAccess, runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";

const mutate = createSpellMutation();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  return runBattleMutation(req, {
    params: await params,
    access: BattleAccess.MEMBER,
    requireStatus: BattleStatus.ACTIVE,
    rateLimitScope: "spell",
    schema: spellSchema,
    dryRun: (body) => body.preview === true,
    mutate,
  });
}
