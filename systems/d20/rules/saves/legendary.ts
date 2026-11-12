import { textRef } from "@/lib/i18n/text-ref";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export function resolveSave<T extends { success: boolean }>(participant: BattleParticipant, result: T): { result: T; participant: BattleParticipant; message: LogLine | null } {
  const legendary = participant.battleData.legendary;

  if (result.success || !legendary || legendary.resistLeft <= 0) return { result, participant, message: null };

  const resistLeft = legendary.resistLeft - 1;

  return {
    result: { ...result, success: true },
    participant: { ...participant, battleData: { ...participant.battleData, legendary: { ...legendary, resistLeft }, ...(participant.battleData.lair && { lair: { ...participant.battleData.lair, resistSpent: participant.battleData.lair.resistSpent + 1 } }) } },
    message: textRef("battleLog.saves.legendaryResist", { name: participant.basicInfo.name, left: resistLeft }),
  };
}
