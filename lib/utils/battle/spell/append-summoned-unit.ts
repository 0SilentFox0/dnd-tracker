import { ParticipantSourceType } from "@/lib/constants/battle";
import { applyBakedAuras } from "@/lib/utils/abilities/build/bake";
import { calculateInitiative } from "@/lib/utils/battle/battle-start";
import type { BattleParticipant } from "@/types/battle";

export function nextInstanceNumber(order: BattleParticipant[], unitId: string): number {
  return order.filter((p) => p.basicInfo.sourceType === ParticipantSourceType.UNIT && p.basicInfo.sourceId === unitId).length + 1;
}

export function appendToInitiativeEnd(order: BattleParticipant[], built: BattleParticipant): { finalOrder: BattleParticipant[]; added: BattleParticipant } {
  const finalOrder = applyBakedAuras([...order, built], new Set([built.basicInfo.id]));

  const added = finalOrder[finalOrder.length - 1];

  const calc = calculateInitiative(added);

  added.abilities.initiative = calc;
  added.abilities.baseInitiative = calc;

  return { finalOrder, added };
}
