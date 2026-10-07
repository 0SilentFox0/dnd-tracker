import { statWithModifiers } from "@/lib/utils/abilities/engine/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/participants";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import { BattleParticipant } from "@/types/battle";

export function getEffectiveArmorClass(p: BattleParticipant, participants: BattleParticipant[] = [p], extra?: StaticEffect[]): number {
  return statWithModifiers(withSelf(participants, p), p.basicInfo.id, "armor", p.combatStats.armorClass, { extra });
}

/**
 * Застосовує використання основної дії: якщо є пул додаткових дій (pendingExtraActions),
 * споживає одну й залишає hasUsedAction = false; інакше виставляє hasUsedAction = true.
 * Ефект «Додаткова дія» накопичувальний до кінця бою.
 */
export function applyMainActionUsed(
  participant: BattleParticipant,
): BattleParticipant {
  const pending = participant.battleData.pendingExtraActions ?? 0;

  if (pending > 0) {
    return {
      ...participant,
      battleData: {
        ...participant.battleData,
        pendingExtraActions: pending - 1,
      },
      actionFlags: { ...participant.actionFlags, hasUsedAction: false },
    };
  }

  return {
    ...participant,
    actionFlags: { ...participant.actionFlags, hasUsedAction: true },
  };
}
