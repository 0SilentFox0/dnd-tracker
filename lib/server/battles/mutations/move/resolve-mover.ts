import { API_ERRORS } from "@/lib/constants/api-errors";
import { findParticipant, isActive, isEscaped } from "@/lib/utils/abilities/engine/core/participants";
import { canActNow, currentOf } from "@/lib/utils/battle/common/control";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, BattleRuleError } from "@/lib/utils/battle/store";
import type { BattleParticipant } from "@/types/battle";

export interface MoverContext {
  participants: BattleParticipant[];
  mover: BattleParticipant;
  ownTurn: boolean;
}

export function resolveMover(ctx: BattleMutationContext, participantId: string, place: (ps: BattleParticipant[]) => BattleParticipant[]): MoverContext {
  const found = findParticipant(ctx.participants, participantId);

  if (!found) throw new BattleAccessError(404, API_ERRORS.BATTLE_PARTICIPANT_NOT_IN_BATTLE);

  const participants = found.battleData.position ? ctx.participants : place(ctx.participants);

  const mover = findParticipant(participants, participantId) ?? found;

  if (!isActive(mover) || mover.battleData.reserved || isEscaped(mover)) throw new BattleRuleError("participant_dead", API_ERRORS.BATTLE_PARTICIPANT_CANNOT_MOVE);

  if (mover.battleData.airborne) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_PARTICIPANT_AIRBORNE);

  const current = currentOf(ctx);

  const ownTurn = current?.basicInfo.id === mover.basicInfo.id;

  if (!ownTurn && !ctx.isDM) throw new BattleAccessError(403, API_ERRORS.BATTLE_MOVE_OWN_TURN);

  if (ownTurn && !canActNow(ctx, mover, current)) throw new BattleAccessError(403, API_ERRORS.FORBIDDEN);

  return { participants, mover, ownTurn };
}
