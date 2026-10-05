import type { BattleSceneState } from "@/lib/utils/battle/store";
import type { BattleScene } from "@/types/api";
import type { BattleParticipant } from "@/types/battle";

export function toApiBattle(scene: BattleSceneState, participants: BattleParticipant[], pending: BattleParticipant[]) {
  return {
    id: scene.id,
    campaignId: scene.campaignId,
    status: scene.status,
    currentRound: scene.round,
    currentTurnIndex: scene.turnIndex,
    initiativeOrder: participants,
    pendingSummons: pending,
    version: scene.version,
  } satisfies Pick<
    BattleScene,
    "id" | "campaignId" | "status" | "currentRound" | "currentTurnIndex" | "initiativeOrder" | "pendingSummons"
  > & { version: number };
}
