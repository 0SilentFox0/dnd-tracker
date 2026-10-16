import { restoreCharm } from "@/lib/utils/abilities/engine/effects/charm";
import { decreaseEffectDurations } from "@/lib/utils/battle/turn/effects";
import type { BattleParticipant } from "@/types/battle";

export function finishTurnEffects(p: BattleParticipant): { participant: BattleParticipant; expired: string[] } {
  const { updatedEffects, expiredEffects } = decreaseEffectDurations(p);

  const charmEnded = p.battleData.activeEffects.find((e) => e.charmOrigin && !updatedEffects.some((u) => u.id === e.id));

  const charmReturn = charmEnded?.charmOrigin ?? p.battleData.charmReturn;

  const next: BattleParticipant = { ...p, battleData: { ...p.battleData, activeEffects: updatedEffects, ...(charmReturn && { charmReturn }) } };

  return { participant: charmReturn ? restoreCharm(next) : next, expired: expiredEffects };
}

export function endTurnCleanup(p: BattleParticipant): BattleParticipant {
  return finishTurnEffects(p).participant;
}
