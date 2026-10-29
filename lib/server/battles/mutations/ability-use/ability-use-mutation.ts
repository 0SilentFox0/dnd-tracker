import { getCachedSummonPool } from "@/lib/cache/reference-data";
import { runAbilityUse } from "@/lib/utils/battle/pipeline/ability-use";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import type { SummonDeps } from "@/lib/utils/battle/summon/ability-summons";

export type AbilityUseSlot = "action" | "bonusAction";

export interface AbilityUseBody {
  participantId: string;
  abilityKey: string;
  targetParticipantIds?: string[];
  targetParticipantId?: string;
  targetCell?: { x: number; y: number };
}

const defaultDeps: SummonDeps = { loadPool: getCachedSummonPool };

export function createAbilityUseMutation<TBody extends AbilityUseBody>(slot: AbilityUseSlot, deps: SummonDeps = defaultDeps) {
  return (ctx: BattleMutationContext, data: TBody): Promise<MutationResult> => {
    const single = slot === "bonusAction" && data.targetParticipantId ? [data.targetParticipantId] : [];

    return runAbilityUse(
      ctx,
      { participantId: data.participantId, abilityKey: data.abilityKey, targetIds: data.targetParticipantIds ?? single, targetCell: data.targetCell },
      slot,
      deps,
    );
  };
}
