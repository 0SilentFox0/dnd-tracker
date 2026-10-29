import { textRef } from "@/lib/i18n/text-ref";
import { restoreCharm } from "@/lib/utils/abilities/engine/effects/charm";
import { dropConcentration, hasConcentration } from "@/lib/utils/battle/concentration";
import { restoreExhaustionHp, syncExhaustion } from "@/lib/utils/battle/conditions/query";
import { setExtraActionPool } from "@/lib/utils/battle/participant/helpers";
import { rollSaveEnds } from "@/lib/utils/battle/saves/save-ends";
import { decreaseEffectDurations } from "@/lib/utils/battle/turn/effects";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export interface SaveEndsContext {
  participants: BattleParticipant[];
  round?: number;
  rules?: Ruleset;
  rng: () => number;
}

export function finishTurnEffects(source: BattleParticipant, saves?: SaveEndsContext): { participant: BattleParticipant; expired: string[]; messages: LogLine[] } {
  const rolled = saves ? rollSaveEnds(source, saves.participants, saves.rules, saves.rng) : { participant: source, messages: [] };

  let p = rolled.participant;

  if (p.battleData.pendingCast && (!hasConcentration(p) || (saves?.round !== undefined && p.battleData.pendingCast.lastRound < saves.round))) {
    const dropped = dropConcentration([p], p.basicInfo.id, textRef("battleLog.concentration.reasons.castSkipped"));

    p = { ...dropped.participants[0], battleData: { ...dropped.participants[0].battleData, pendingCast: undefined } };
    rolled.messages.push(...dropped.messages);
  }

  const { updatedEffects, expiredEffects } = decreaseEffectDurations(p);

  const removed = p.battleData.activeEffects.filter((e) => !updatedEffects.some((u) => u.id === e.id));

  const charmEnded = removed.find((e) => e.charmOrigin);

  const charmReturn = charmEnded?.charmOrigin ?? p.battleData.charmReturn;

  const next: BattleParticipant = { ...p, battleData: { ...p.battleData, activeEffects: updatedEffects, ...(charmReturn && { charmReturn }) } };

  const restored = syncExhaustion(restoreExhaustionHp(next, removed));

  return { participant: charmReturn ? restoreCharm(restored) : restored, expired: expiredEffects, messages: rolled.messages };
}

export function endTurnCleanup(p: BattleParticipant): BattleParticipant {
  return setExtraActionPool(finishTurnEffects(p).participant, 0);
}
