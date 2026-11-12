import { runTurnHooks } from "./hooks";

import { findParticipant, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { restoreCharm } from "@/lib/utils/abilities/engine/effects/charm";
import { restoreExhaustionHp, syncExhaustion } from "@/lib/utils/battle/conditions/query";
import { setExtraActionPool } from "@/lib/utils/battle/participant/helpers";
import { savesOf } from "@/lib/utils/battle/saves/access";
import { decreaseEffectDurations } from "@/lib/utils/battle/turn/effects";
import type { Ruleset } from "@/lib/utils/rules";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export interface SaveEndsContext {
  participants: BattleParticipant[];
  round?: number;
  rules: Ruleset;
  rng: () => number;
}

/** `saves` rolls save-ends; `hookEnv` (defaults to `saves`) lets the rules' turn-end hooks run without rolling them. Without either, no hooks run. */
export function finishTurnEffects(source: BattleParticipant, saves?: SaveEndsContext, hookEnv: SaveEndsContext | undefined = saves): { participant: BattleParticipant; expired: LogLine[]; messages: LogLine[] } {
  const rolled = saves ? savesOf(saves.rules).rollEnds(source, saves.participants, saves.rules, saves.rng) : { participant: source, messages: [] };

  let p = rolled.participant;

  const endHooks = hookEnv && ruleSystemOf(hookEnv.rules).combat.turn?.onTurnEnd;

  if (hookEnv && endHooks) {
    const id = p.basicInfo.id;

    const ended = runTurnHooks(endHooks, { participants: replaceParticipant(hookEnv.participants, p), id, round: hookEnv.round ?? 0, rng: hookEnv.rng, rules: hookEnv.rules });

    p = findParticipant(ended.participants, id) ?? p;
    rolled.messages.push(...ended.messages);
  }

  const { updatedEffects, expiredEffects } = decreaseEffectDurations(p);

  const removed = p.battleData.activeEffects.filter((e) => !updatedEffects.some((u) => u.id === e.id));

  const charmEnded = removed.find((e) => e.charmOrigin);

  const charmReturn = charmEnded?.charmOrigin ?? p.battleData.charmReturn;

  const next: BattleParticipant = { ...p, battleData: { ...p.battleData, activeEffects: updatedEffects, ...(charmReturn && { charmReturn }) } };

  const restored = syncExhaustion(restoreExhaustionHp(next, removed));

  return { participant: charmReturn ? restoreCharm(restored) : restored, expired: expiredEffects, messages: rolled.messages };
}

export function endTurnCleanup(p: BattleParticipant, hookEnv?: SaveEndsContext): BattleParticipant {
  return setExtraActionPool(finishTurnEffects(p, undefined, hookEnv).participant, 0);
}
