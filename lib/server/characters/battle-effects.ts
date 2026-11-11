import "server-only";
import { BattleStatus, ParticipantSourceType } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import type { ParticipantState } from "@/lib/utils/battle/store/types";
import type { ActiveEffect } from "@/types/battle";

/** Active effects of the character's battle participant; null when the character is not in an active battle. */
export async function loadBattleEffects(campaignId: string, characterId: string): Promise<ActiveEffect[] | null> {
  const row = await prisma.battleParticipant.findFirst({
    where: { sourceType: ParticipantSourceType.CHARACTER, sourceId: characterId, battle: { campaignId, status: BattleStatus.ACTIVE } },
    select: { state: true },
  });

  return row ? ((row.state as unknown as ParticipantState).activeEffects as ActiveEffect[]) : null;
}
