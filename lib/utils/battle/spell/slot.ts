import { ParticipantSourceType } from "@/lib/constants/battle";
import type { BattleParticipant } from "@/types/battle";

/** Кантрипи (коло 0) слота не потребують. */
export const spellNeedsSlot = (level: number): boolean => level > 0;

/** Юніт кастує з універсального слота, герой — зі слота кола. */
export function spellSlotKey(p: BattleParticipant, level: number): string {
  return p.basicInfo.sourceType === ParticipantSourceType.UNIT ? "universal" : String(level);
}

export function spellSlotLeft(p: BattleParticipant, level: number): number {
  return p.spellcasting?.spellSlots?.[spellSlotKey(p, level)]?.current ?? 0;
}
