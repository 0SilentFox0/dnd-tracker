import { footprintDistance } from "./geometry";
import { cellsOf, isOnMap } from "./occupancy";

import type { BattleParticipant } from "@/types/battle";

export function nearestTo(from: BattleParticipant, candidates: BattleParticipant[]): BattleParticipant | undefined {
  if (!isOnMap(from)) return candidates[0];

  const origin = cellsOf(from);

  const distance = (p: BattleParticipant) => (isOnMap(p) ? footprintDistance(origin, cellsOf(p)) : Infinity);

  return candidates.reduce<BattleParticipant | undefined>((best, p) => (!best || distance(p) < distance(best) ? p : best), undefined);
}
