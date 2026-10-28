import { ParticipantSourceType } from "@/lib/constants/battle";
import { PACT_KEY, pactSlot } from "@/lib/utils/spells/slot-keys";
import type { BattleParticipant } from "@/types/battle";

/** Кантрипи (коло 0) слота не потребують. */
export const spellNeedsSlot = (level: number): boolean => level > 0;

/** Юніт кастує з універсального слота, герой — зі слота кола. */
export function spellSlotKey(p: BattleParticipant, level: number): string {
  if (p.basicInfo.sourceType === ParticipantSourceType.UNIT) return "universal";

  const slots = p.spellcasting?.spellSlots;

  const pact = pactSlot(slots);

  if ((slots?.[String(level)]?.current ?? 0) <= 0 && pact && (pact.level ?? 0) >= level && pact.current > 0) return PACT_KEY;

  return String(level);
}

export function spellSlotLeft(p: BattleParticipant, level: number): number {
  return p.spellcasting?.spellSlots?.[spellSlotKey(p, level)]?.current ?? 0;
}
