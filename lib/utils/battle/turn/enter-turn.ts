import { processStartOfTurn } from "./turn-start";

import { isActive, sitsOutTurn } from "@/lib/utils/abilities/engine/core/participants";
import type { Rng } from "@/lib/utils/abilities/engine/core/types";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export interface EnterTurnInput {
  before: BattleParticipant[];
  after: BattleParticipant[];
  /** turn index before the change and the one the mutation wants to land on */
  fromIndex: number;
  toIndex: number;
  round: number;
  rng?: Rng;
  map?: BattleMapConfig | null;
  rules: Ruleset;
}

export interface EnterTurnResult {
  participants: BattleParticipant[];
  turnIndex: number;
  messages: LogLine[];
}

/**
 * Initiative roll/reorder swaps who stands at the current index outside the advance loop: the newcomer gets the start-of-turn pass
 * (fresh turn state, DoT/effects) and sitting-out actors are skipped. No-op when the actor did not change or the battle has not begun.
 */
export function enterChangedTurn({ before, after, fromIndex, toIndex, round, rng = Math.random, map, rules }: EnterTurnInput): EnterTurnResult {
  const unchanged = { participants: after, turnIndex: toIndex, messages: [] };

  if (before[fromIndex]?.basicInfo.id === after[toIndex]?.basicInfo.id) return unchanged;

  // the very first turn of a battle never runs start-of-turn either (battle start only fires round triggers)
  if (round === 1 && fromIndex === 0 && toIndex === 0) return unchanged;

  let order = after;

  const messages: LogLine[] = [];

  for (let i = toIndex; i < order.length; i++) {
    if (sitsOutTurn(order[i], round)) continue;

    const turn = processStartOfTurn(order[i], round, order, rng, map, rules);

    order = turn.participants;
    messages.push(...turn.rechargeMessages, ...turn.damageMessages, ...(turn.hazard ? [turn.hazard.message] : []), ...turn.expiredEffects, ...turn.abilityMessages);

    if (isActive(turn.participant)) return { participants: order, turnIndex: i, messages };
  }

  return unchanged;
}
