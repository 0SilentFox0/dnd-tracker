import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import type { Rng } from "@/lib/utils/abilities/engine/core/types";
import type { Ruleset } from "@/lib/utils/rules";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import type { BattleAction, BattleMapConfig, BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export interface JoinTriggersResult {
  participants: BattleParticipant[];
  messages: LogLine[];
  psychology: { lines: LogLine[]; targets: BattleAction["targets"] };
}

export function runJoinTriggers(order: BattleParticipant[], ctx: { round: number; rng: Rng; map: BattleMapConfig | null | undefined; rules: Ruleset }, newcomerIds?: readonly string[]): JoinTriggersResult {
  const joined = runAbilities(order, { type: "battleStart", ...(newcomerIds && { newcomerIds: [...newcomerIds] }) }, ctx);

  const tested = ruleSystemOf(ctx.rules).traits?.psychology?.(joined.participants, { round: ctx.round, rng: ctx.rng, newcomerIds });

  if (!tested) return { participants: joined.participants, messages: joined.messages, psychology: { lines: [], targets: [] } };

  const targets = tested.testerIds.flatMap((id) => {
    const p = tested.participants.find((x) => x.basicInfo.id === id);

    return p ? [{ participantId: id, participantName: p.basicInfo.name }] : [];
  });

  return { participants: tested.participants, messages: joined.messages, psychology: { lines: tested.messages, targets } };
}
