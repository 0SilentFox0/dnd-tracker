import { CELL_FEET } from "@/lib/constants/battle";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import { cellsOf, footprintDistance } from "@/lib/utils/battle/grid";
import { isOnMap } from "@/lib/utils/battle/grid/occupancy";
import type { BattleParticipant } from "@/types/battle";

/** Живі предмети цього заклинання, викликані власником, у межах feet від цілі. */
export function objectsNear(ps: BattleParticipant[], ownerId: string, spellId: string, target: BattleParticipant, feet: number): BattleParticipant[] {
  if (!isOnMap(target)) return [];

  return ps.filter((p) => p.battleData.object?.spellId === spellId && p.battleData.summonedBy === ownerId && isActive(p) && isOnMap(p) && footprintDistance(cellsOf(p), cellsOf(target)) * CELL_FEET <= feet);
}
