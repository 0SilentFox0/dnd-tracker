import { z } from "zod";

import { getCachedSummonPool } from "@/lib/cache/reference-data";
import { mapCellSchema } from "@/lib/schemas/battles";
import { runAbilityUse } from "@/lib/utils/battle/pipeline/ability-use";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import type { SummonDeps } from "@/lib/utils/battle/summon/ability-summons";

export const bonusActionSchema = z.object({
  participantId: z.string(),
  abilityKey: z.string(),
  targetParticipantId: z.string().optional(),
  targetParticipantIds: z.array(z.string()).optional(),
  targetCell: mapCellSchema.optional(),
});

export type BonusActionBody = z.infer<typeof bonusActionSchema>;

const defaultDeps: SummonDeps = { loadPool: getCachedSummonPool };

export function createBonusActionMutation(deps: SummonDeps = defaultDeps) {
  return (ctx: BattleMutationContext, data: BonusActionBody): Promise<MutationResult> =>
    runAbilityUse(
      ctx,
      { participantId: data.participantId, abilityKey: data.abilityKey, targetIds: data.targetParticipantIds ?? (data.targetParticipantId ? [data.targetParticipantId] : []), targetCell: data.targetCell },
      "bonusAction",
      deps,
    );
}

export const bonusActionMutation = createBonusActionMutation();
