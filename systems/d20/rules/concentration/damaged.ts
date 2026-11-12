import { findParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { concentrationBroken, concentrationCheck, dropConcentration, hasConcentration } from "@/lib/utils/battle/concentration";
import type { DamagedHook } from "@/lib/utils/rules/systems/types";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export const concentrationFallout: DamagedHook = (ctx, result) => {
  const { rules, amount } = ctx;

  const { participant } = result;

  if ((!rules.concentration.enabled && !participant.battleData.pendingCast) || amount <= 0 || !hasConcentration(participant)) return result;

  const r = concentrationCheck({ caster: participant, damage: amount, participants: result.participants, rules, rng: ctx.rng });

  return { participant: findParticipant(r.participants, participant.basicInfo.id) ?? participant, participants: r.participants, messages: [...result.messages, ...r.messages] };
};

export function dropBrokenConcentration(next: BattleParticipant, participants: BattleParticipant[]): { participants: BattleParticipant[]; messages: LogLine[] } {
  if (!concentrationBroken(next)) return { participants, messages: [] };

  return dropConcentration(participants, next.basicInfo.id, "");
}
