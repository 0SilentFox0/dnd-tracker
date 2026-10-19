import { canStand } from "./occupancy";

import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

export type ReturnToStart = { ok: true; to: GridPoint } | { ok: false; error: string };

const refuse = (error: string): ReturnToStart => ({ ok: false, error });

export function checkReturnToStart(map: BattleMapConfig | null | undefined, participants: BattleParticipant[], mover: BattleParticipant): ReturnToStart {
  const { turnStartPosition, returnedThisTurn } = mover.battleData;

  if (!map || findFlags(participants, mover.basicInfo.id, "strikeAndReturn").length === 0 || returnedThisTurn || !turnStartPosition) return refuse("Повернутися неможливо");

  if (!mover.actionFlags.hasUsedAction) return refuse("Повернення доступне лише після атаки");

  if (!canStand(map, participants, mover, turnStartPosition)) return refuse("Повернутися неможливо: клітинка зайнята");

  return { ok: true, to: turnStartPosition };
}
