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
  orderAfterSpell: BattleParticipant[];
}): Promise<{
  finalOrder: BattleParticipant[];
  summoned: BattleParticipant | null;
}> {
  const { campaignId, battleId, summonUnitId, casterSide, orderAfterSpell } =
    params;

  const unit = await prisma.unit.findUnique({
    where: { id: summonUnitId },
  });

  if (!unit || unit.campaignId !== campaignId) {
    return { finalOrder: orderAfterSpell, summoned: null };
  }

  const instanceNumber =
    orderAfterSpell.filter(
      (p) =>
        p.basicInfo.sourceType === ParticipantSourceType.UNIT &&
        p.basicInfo.sourceId === unit.id,
    ).length + 1;

  const built = await createBattleParticipantFromUnit(
    unit,
    battleId,
    casterSide,
    instanceNumber,
  );

  const finalOrder = applyBakedAuras([...orderAfterSpell, built], new Set([built.basicInfo.id]));

  const newParticipant = finalOrder[finalOrder.length - 1];

  const calc = calculateInitiative(newParticipant);

  newParticipant.abilities.initiative = calc;
  newParticipant.abilities.baseInitiative = calc;

  return { finalOrder, summoned: newParticipant };
}
