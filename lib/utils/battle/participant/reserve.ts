import type { BattleParticipant } from "@/types/battle";

export const isReserved = (p: BattleParticipant): boolean => p.battleData.reserved === true;

export const reserveOf = (pending: BattleParticipant[]): BattleParticipant[] => pending.filter(isReserved);

export const summonsOf = (pending: BattleParticipant[]): BattleParticipant[] => pending.filter((p) => !isReserved(p));

export const toReserve = (p: BattleParticipant): BattleParticipant => ({ ...p, battleData: { ...p.battleData, reserved: true } });

export function dropBattleFlag(p: BattleParticipant, key: "reserved" | "revealPending"): BattleParticipant {
  const battleData = { ...p.battleData };

  delete battleData[key];

  return { ...p, battleData };
}
