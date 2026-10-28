import type { BattleParticipant } from "@/types/battle";

export function resetTurnState(p: BattleParticipant): BattleParticipant["battleData"] {
  return {
    ...p.battleData,
    retaliationsUsed: 0,
    ...(p.battleData.movementUsed && { movementUsed: 0 }),
    turnStartPosition: p.battleData.position,
    returnedThisTurn: undefined,
    extraMovement: undefined,
    readied: undefined,
  };
}
