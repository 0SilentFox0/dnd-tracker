import { footprintDistance } from "./geometry";
import { cellsOf, isOnMap } from "./occupancy";

import type { BattleParticipant } from "@/types/battle";

export function nearestTo(from: BattleParticipant, candidates: BattleParticipant[]): BattleParticipant | undefined {
  const origin = cellsOf(from);

  if (origin.length === 0) return candidates[0];

  const distance = (p: BattleParticipant) => (isOnMap(p) ? footprintDistance(origin, cellsOf(p)) : Infinity);

  let best: BattleParticipant | undefined;

  let bestDistance = Infinity;

  for (const p of candidates) {
    const d = distance(p);

    if (!best || d < bestDistance) {
      best = p;
      bestDistance = d;
    }
  }

  return best;
}
