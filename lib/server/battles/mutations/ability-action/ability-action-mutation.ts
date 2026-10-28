import { z } from "zod";

import { getCachedSummonPool } from "@/lib/cache/reference-data";
import { mapCellSchema } from "@/lib/schemas/battles";
import { runAbilityUse } from "@/lib/utils/battle/pipeline/ability-use";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import type { SummonDeps } from "@/lib/utils/battle/summon/ability-summons";

export const abilityActionSchema = z.object({
  participantId: z.string(),
  abilityKey: z.string(),
  targetParticipantIds: z.array(z.string()).optional(),
  targetCell: mapCellSchema.optional(),
});

export type AbilityActionBody = z.infer<typeof abilityActionSchema>;

const defaultDeps: SummonDeps = { loadPool: getCachedSummonPool };

export function createAbilityActionMutation(deps: SummonDeps = defaultDeps) {
  return (ctx: BattleMutationContext, data: AbilityActionBody): Promise<MutationResult> =>
    runAbilityUse(ctx, { participantId: data.participantId, abilityKey: data.abilityKey, targetIds: data.targetParticipantIds ?? [], targetCell: data.targetCell }, "action", deps);
}

export const abilityActionMutation = createAbilityActionMutation();
