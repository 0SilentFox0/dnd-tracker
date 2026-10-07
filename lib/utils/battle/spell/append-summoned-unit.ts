import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { applyBakedAuras } from "@/lib/utils/abilities/build/bake";
import { calculateInitiative } from "@/lib/utils/battle/battle-start";
import { createBattleParticipantFromUnit } from "@/lib/utils/battle/participant";
import type { BattleParticipant } from "@/types/battle";

export async function appendSummonedUnitToInitiativeEnd(params: {
  campaignId: string;
  battleId: string;
  summonUnitId: string;
  casterSide: ParticipantSide;
  casterControlledBy?: string;
  orderAfterSpell: BattleParticipant[];
}): Promise<{
  finalOrder: BattleParticipant[];
  summoned: BattleParticipant | null;
}> {
  const { campaignId, battleId, summonUnitId, casterSide, casterControlledBy, orderAfterSpell } =
    params;

  const unit = await prisma.unit.findUnique({
    where: { id: summonUnitId },
  });

  if (!unit || unit.campaignId !== campaignId) {
    return { finalOrder: orderAfterSpell, summoned: null };
  }

  const instanceNumber = nextInstanceNumber(orderAfterSpell, unit.id);

  const built = await createBattleParticipantFromUnit(
    unit,
    battleId,
    casterSide,
    instanceNumber,
  );

  const owned = casterControlledBy ? { ...built, basicInfo: { ...built.basicInfo, controlledBy: casterControlledBy } } : built;

  const { finalOrder, added } = appendToInitiativeEnd(orderAfterSpell, owned);

  return { finalOrder, summoned: added };
}

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
