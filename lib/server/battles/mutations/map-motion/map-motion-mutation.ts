import { API_ERRORS } from "@/lib/constants/api-errors";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleRuleError } from "@/lib/utils/battle/store";
import type { MapMotionData } from "@/types/api";

export function mapMotionMutation(ctx: BattleMutationContext, body: MapMotionData): MutationResult {
  const map = ctx.meta.map;

  if (!map) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_NO_MAP);

  const { motion: _previous, ...rest } = map;

  return {
    participants: ctx.participants,
    pending: ctx.pending,
    events: [],
    scene: { map: body.motion ? { ...rest, motion: body.motion } : rest },
  };
}
