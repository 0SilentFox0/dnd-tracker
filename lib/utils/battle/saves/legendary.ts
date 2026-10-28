import type { BattleParticipant } from "@/types/battle";

export function resolveSave<T extends { success: boolean }>(participant: BattleParticipant, result: T): { result: T; participant: BattleParticipant; message: string | null } {
  const legendary = participant.battleData.legendary;

  if (result.success || !legendary || legendary.resistLeft <= 0) return { result, participant, message: null };

  const resistLeft = legendary.resistLeft - 1;

  return {
    result: { ...result, success: true },
    participant: { ...participant, battleData: { ...participant.battleData, legendary: { ...legendary, resistLeft }, ...(participant.battleData.lair && { lair: { ...participant.battleData.lair, resistSpent: participant.battleData.lair.resistSpent + 1 } }) } },
    message: `👑 ${participant.basicInfo.name}: Легендарний опір — провал стає успіхом (${resistLeft} залишилось)`,
  };
}
