import { footprintDistance } from "./geometry";
import { cellsOf, isOnMap } from "./occupancy";

import type { BattleParticipant } from "@/types/battle";

export function nearestTo(from: BattleParticipant, candidates: BattleParticipant[]): BattleParticipant | undefined {
  const origin = cellsOf(from);

  if (origin.length === 0) return candidates[0];

  const distance = (p: BattleParticipant) => (isOnMap(p) ? footprintDistance(origin, cellsOf(p)) : Infinity);

  return candidates.reduce<BattleParticipant | undefined>((best, p) => (!best || distance(p) < distance(best) ? p : best), undefined);
}
