import { collectModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import type { BattleParticipant } from "@/types/battle";

export function cancelCritIfImmune<T extends { isCritical: boolean; criticalEffect?: unknown }>(roll: T, participants: BattleParticipant[], targetId: string, extra?: StaticEffect[]): { roll: T; cancelled: boolean } {
  if (!roll.isCritical || collectModifiers(participants, targetId, { flag: "critImmunity" }, extra).entries.length === 0) return { roll, cancelled: false };

  return { roll: { ...roll, isCritical: false, criticalEffect: undefined }, cancelled: true };
}
