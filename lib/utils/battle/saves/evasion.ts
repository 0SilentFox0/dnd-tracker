import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/core/participants";
import { hasCondition } from "@/lib/utils/battle/conditions/query";
import type { BattleParticipant } from "@/types/battle";

export function hasEvasion(participants: BattleParticipant[], target: BattleParticipant): boolean {
  return !hasCondition(target, "incapacitated") && findFlags(withSelf(participants, target), target.basicInfo.id, "evasion").length > 0;
}

export function evasionFactor(success: boolean, evasive: boolean): number {
  if (evasive) return success ? 0 : 0.5;

  return success ? 0.5 : 1;
}
