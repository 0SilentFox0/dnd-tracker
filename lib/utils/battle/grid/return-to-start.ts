import { canStand } from "./occupancy";

import { textRef } from "@/lib/i18n/text-ref";
import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { REJECT } from "@/lib/utils/battle/store/reject";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";
import type { LogLine } from "@/types/text";

export type ReturnToStart = { ok: true; to: GridPoint } | { ok: false; error: LogLine };

const refuse = (error: LogLine): ReturnToStart => ({ ok: false, error });

export function checkReturnToStart(map: BattleMapConfig | null | undefined, participants: BattleParticipant[], mover: BattleParticipant): ReturnToStart {
  const { turnStartPosition, returnedThisTurn } = mover.battleData;

  if (!map || findFlags(participants, mover.basicInfo.id, "strikeAndReturn").length === 0 || returnedThisTurn || !turnStartPosition) return refuse(textRef(REJECT.returnImpossible));

  if (!mover.actionFlags.hasUsedAction) return refuse(textRef(REJECT.returnAfterAttack));

  if (!canStand(map, participants, mover, turnStartPosition)) return refuse(textRef(REJECT.returnOccupied));

  return { ok: true, to: turnStartPosition };
}
