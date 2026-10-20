import { restoreCharm } from "@/lib/utils/abilities/engine/effects/charm";
import { isFallen } from "@/lib/utils/battle/grid/occupancy";
import type { BattleParticipant } from "@/types/battle";

const clears = (p: BattleParticipant) => isFallen(p) && p.battleData.activeEffects.length > 0;

/** Полеглий втрачає всі баффи, дебаффи й зони; пасивки відновлюються з вмінь при воскресінні. */
export function clearFallenEffects(participants: BattleParticipant[]): BattleParticipant[] {
  if (!participants.some(clears)) return participants;

  // чари знімаються через restoreCharm, інакше зачарований назавжди лишився б на чужому боці
  return participants.map((p) => {
    if (!clears(p)) return p;

    const freed = restoreCharm(p);

    return { ...freed, battleData: { ...freed.battleData, activeEffects: [] } };
  });
}
