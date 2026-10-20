import { isFallen } from "@/lib/utils/battle/grid/occupancy";
import type { BattleParticipant } from "@/types/battle";

/** Полеглий втрачає всі баффи, дебаффи й зони; пасивки відновлюються з вмінь при воскресінні. */
export function clearFallenEffects(participants: BattleParticipant[]): BattleParticipant[] {
  if (!participants.some((p) => isFallen(p) && p.battleData.activeEffects.length > 0)) return participants;

  return participants.map((p) => (isFallen(p) && p.battleData.activeEffects.length > 0 ? { ...p, battleData: { ...p.battleData, activeEffects: [] } } : p));
}
