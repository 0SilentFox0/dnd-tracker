import { restoreCharm } from "@/lib/utils/abilities/engine/charm";
import { withoutEffects } from "@/lib/utils/battle/attack/consume-effects";
import type { BattleParticipant } from "@/types/battle";

export function expireTurnEndEffects(p: BattleParticipant): BattleParticipant {
  return withoutEffects(p, (e) => e.expireAtTurnEnd === true && e.duration === 1);
}

export function endTurnCleanup(p: BattleParticipant): BattleParticipant {
  const expired = expireTurnEndEffects(p);

  return expired.battleData.charmReturn ? restoreCharm(expired) : expired;
}
