import { API_ERRORS } from "@/lib/constants/api-errors";
import { findParticipant, isActive, isEscaped } from "@/lib/utils/abilities/engine/core/participants";
import { canActNow } from "@/lib/utils/battle/common/control";
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

  if (!found) throw new BattleAccessError(404, "Учасника немає в бою");

  const participants = found.battleData.position ? ctx.participants : place(ctx.participants);

  const mover = findParticipant(participants, participantId) ?? found;

  if (!isActive(mover) || mover.battleData.reserved || isEscaped(mover)) throw new BattleRuleError("participant_dead", "Учасник не може рухатися");

  if (mover.battleData.airborne) throw new BattleRuleError("action_rejected", "Учасник у повітрі — приземлиться на початку свого ходу");

  const current = ctx.participants[ctx.scene.turnIndex];

  const ownTurn = current?.basicInfo.id === mover.basicInfo.id;

  if (!ownTurn && !ctx.isDM) throw new BattleAccessError(403, "Рухатися можна лише у свій хід");

  if (ownTurn && !canActNow(ctx, mover, current)) throw new BattleAccessError(403, API_ERRORS.FORBIDDEN);

  return { participants, mover, ownTurn };
}
