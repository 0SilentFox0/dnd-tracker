/**
 * Додає учасника-юніта в кінець initiativeOrder після касту заклинання.
 */

import { ParticipantSide } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { distributePendingScopedArtifactBonuses } from "@/lib/utils/battle/artifact-sets";
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
        p.basicInfo.sourceType === "unit" &&
        p.basicInfo.sourceId === unit.id,
    ).length + 1;

  const newParticipant = await createBattleParticipantFromUnit(
    unit,
    battleId,
    casterSide,
    instanceNumber,
  );

  const finalOrder = [...orderAfterSpell, newParticipant];

  distributePendingScopedArtifactBonuses(finalOrder);

  const calc = calculateInitiative(newParticipant);

  newParticipant.abilities.initiative = calc;
  newParticipant.abilities.baseInitiative = calc;

  return { finalOrder, summoned: newParticipant };
}
