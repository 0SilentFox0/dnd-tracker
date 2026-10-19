import { canStand } from "./occupancy";

import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

export function returnToStartError(map: BattleMapConfig, participants: BattleParticipant[], mover: BattleParticipant): string | null {
  const { turnStartPosition, returnedThisTurn } = mover.battleData;

  if (findFlags(participants, mover.basicInfo.id, "strikeAndReturn").length === 0 || returnedThisTurn || !turnStartPosition) return "Повернутися неможливо";

  if (!mover.actionFlags.hasUsedAction) return "Повернення доступне лише після атаки";

  if (!canStand(map, participants, mover, turnStartPosition)) return "Повернутися неможливо: клітинка зайнята";

  return null;
}
