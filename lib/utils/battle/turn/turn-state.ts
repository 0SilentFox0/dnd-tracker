import type { BattleParticipant } from "@/types/battle";

export function resetTurnState(p: BattleParticipant, opts: { keepLegendary?: boolean } = {}): BattleParticipant["battleData"] {
  return {
    ...p.battleData,
    retaliationsUsed: 0,
    ...(p.battleData.movementUsed && { movementUsed: 0 }),
    turnStartPosition: p.battleData.position,
    returnedThisTurn: undefined,
    extraMovement: undefined,
    readied: undefined,
    attacksLeft: undefined,
    attackedWithLight: undefined,
    ...(p.battleData.legendary && !opts.keepLegendary && { legendary: { ...p.battleData.legendary, actionsLeft: p.battleData.legendary.actions } }),
  };
}
