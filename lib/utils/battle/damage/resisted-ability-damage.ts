import { findParticipant, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { applyRawDamage } from "@/lib/utils/abilities/engine/effects/hp";
import { applyResistance } from "@/lib/utils/battle/resistance";
import type { BattleParticipant } from "@/types/battle";

export function dealResistedDamage(ps: BattleParticipant[], targetId: string, amount: number, damageType: string, sourceName: string): { participants: BattleParticipant[]; message: string } {
  const target = findParticipant(ps, targetId);

  if (!target) return { participants: ps, message: "" };

  const { finalDamage } = applyResistance(target, amount, damageType);

  const updated = finalDamage > 0 ? applyRawDamage(target, finalDamage) : target;

  return { participants: replaceParticipant(ps, updated), message: `💥 ${sourceName}: ${target.basicInfo.name} −${finalDamage} HP` };
}
