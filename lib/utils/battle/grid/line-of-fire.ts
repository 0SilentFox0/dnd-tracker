import { blockedSet, cellKey, cellLine, closestCell, inBounds } from "./geometry";
import { bothOnMap, cellsOf, occupiedBy } from "./occupancy";

import { isAirborne } from "@/lib/utils/abilities/engine/core/participants";
import { modeLineBlocked } from "@/lib/utils/battle/modes/engine";
import { isUp } from "@/lib/utils/battle/participant/state";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

export interface LineOfFire {
  blocked: boolean;
  /** Клітинки, що заважають (для підсвітки); стіна лабіринту клітинки не має. */
  cells: string[];
}

const CLEAR: LineOfFire = { blocked: false, cells: [] };

export function lineOfFire(map: BattleMapConfig | null | undefined, participants: BattleParticipant[], shooter: BattleParticipant, target: BattleParticipant): LineOfFire {
  if (!bothOnMap(map, shooter, target)) return CLEAR;

  const from = cellsOf(shooter);

  const to = cellsOf(target);

  const start = closestCell(from, to);

  const line = cellLine(start, closestCell(to, [start]));

  const own = new Set([...from, ...to].map(cellKey));

  const others = participants.filter((p) => p.basicInfo.id !== shooter.basicInfo.id && p.basicInfo.id !== target.basicInfo.id);

  const occupied = occupiedBy(others, (p) => isUp(p) && !isAirborne(p));

  const blocked = blockedSet(map);

  const cells = line
    .filter((c) => {
      const key = cellKey(c);

      if (own.has(key)) return false;

      const kind = map.terrain?.[key]?.kind;

      return !inBounds(map, c) || blocked.has(key) || kind === "wall" || kind === "barrier" || occupied.has(key);
    })
    .map(cellKey);

  return { blocked: cells.length > 0 || modeLineBlocked(map, line), cells };
}
