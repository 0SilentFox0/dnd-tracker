import { hasEffectMarker } from "@/lib/utils/battle/participant/state";
import type { BattleParticipant } from "@/types/battle";

export function getDisabledAttackKinds(p: BattleParticipant): { melee: boolean; ranged: boolean } {
  return { melee: hasEffectMarker(p, "disable_melee_attacks"), ranged: hasEffectMarker(p, "disable_ranged_attacks") };
}
