import { runTurnHooks } from "./hooks";

import type { Ruleset } from "@/lib/utils/rules";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export function skippedTurnAt(
  order: BattleParticipant[],
  index: number,
  ctx: { rules: Ruleset; rng: () => number; round: number },
): { participants: BattleParticipant[]; messages: LogLine[] } | null {
  const p = order[index];

  const hooks = ruleSystemOf(ctx.rules).combat.turn?.onSkippedTurn;

  if (!p || !hooks) return null;

  const r = runTurnHooks(hooks, { participants: order, id: p.basicInfo.id, round: ctx.round, rng: ctx.rng, rules: ctx.rules });

  return r.skipTurn ? { participants: r.participants, messages: r.messages } : null;
}
