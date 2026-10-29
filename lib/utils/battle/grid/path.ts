import { cellKey, difficultSet, footprint, footprintDistance, neighbors } from "./geometry";
import { cellsOf, fits, isOnMap, occupiedBy, sizeOf } from "./occupancy";

import { CELL_FEET, EffectMarker } from "@/lib/constants/battle";
import { statWithModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import { conditionSourceIds } from "@/lib/utils/battle/conditions/query";
import { hasEffectMarker } from "@/lib/utils/battle/participant/state";
import { controlledByDm } from "@/lib/utils/battle/participant/unit-control";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

/** Швидкість у клітинках без Ривка; 0, якщо знерухомлений. */
export function baseMovement(p: BattleParticipant): number {
  if (hasEffectMarker(p, EffectMarker.IMMOBILIZED)) return 0;

  return Math.max(0, Math.floor(statWithModifiers([p], p.basicInfo.id, "speed", p.combatStats.speed) / CELL_FEET));
}

export function movementBudget(p: BattleParticipant): number {
  return baseMovement(p) + (p.battleData.extraMovement ?? 0);
}

export function remainingMovement(p: BattleParticipant): number {
  return Math.max(0, movementBudget(p) - (p.battleData.movementUsed ?? 0));
}

export interface PathSearch {
  cost: Map<string, number>;
  parent: Map<string, GridPoint>;
}

// союзники прохідні, вороги — стіна; стати можна лише на вільне місце; avoid — клітинки, які footprint не зачіпає
export function reachable(
  map: BattleMapConfig,
  participants: BattleParticipant[],
  mover: BattleParticipant,
  budget: number,
  opts: { avoid?: ReadonlySet<string> } = {},
): Map<string, number> {
  return searchPaths(map, participants, mover, budget, opts).cost;
}

/** Клітинки від першого кроку до `to` включно за готовим пошуком; null, якщо `to` недосяжна. */
export function pathFrom({ cost, parent }: PathSearch, mover: BattleParticipant, to: GridPoint): GridPoint[] | null {
  const start = mover.battleData.position;

  if (!start || !cost.has(cellKey(to))) return null;

  const path: GridPoint[] = [];

  for (let cur: GridPoint | undefined = to; cur && cellKey(cur) !== cellKey(start); cur = parent.get(cellKey(cur))) path.unshift(cur);

  return path;
}

export const pathTo = (map: BattleMapConfig, participants: BattleParticipant[], mover: BattleParticipant, to: GridPoint, budget: number) => pathFrom(searchPaths(map, participants, mover, budget), mover, to);

export function searchPaths(
  map: BattleMapConfig,
  participants: BattleParticipant[],
  mover: BattleParticipant,
  budget: number,
  opts: { avoid?: ReadonlySet<string> } = {},
): PathSearch {
  const start = mover.battleData.position;

  const result = new Map<string, number>();

  const parent = new Map<string, GridPoint>();

  if (!start) return { cost: result, parent };

  const size = sizeOf(mover);

  const notMe = (p: BattleParticipant) => p.basicInfo.id !== mover.basicInfo.id;

  const walls = occupiedBy(participants, (p) => notMe(p) && p.basicInfo.side !== mover.basicInfo.side);

  const taken = occupiedBy(participants, notMe);

  const { avoid } = opts;

  const touchesAvoid = (anchor: GridPoint) => !!avoid?.size && footprint(anchor, size).some((c) => avoid.has(cellKey(c)));

  const difficult = difficultSet(map);

  const stepCost = (anchor: GridPoint) => (difficult.size > 0 && footprint(anchor, size).some((c) => difficult.has(cellKey(c))) ? 2 : 1);

  const seen = new Map([[cellKey(start), 0]]);

  // кошики за вартістю: Дейкстра без черги з пріоритетом, вартість кроку лише 1 або 2
  const buckets: GridPoint[][] = [[start]];

  for (let cost = 0; cost < buckets.length && cost < budget; cost++) {
    for (const cur of buckets[cost] ?? []) {
      if (seen.get(cellKey(cur)) !== cost) continue;

      for (const next of neighbors(cur)) {
        const key = cellKey(next);

        const nextCost = cost + stepCost(next);

        if (nextCost > budget || (seen.get(key) ?? Infinity) <= nextCost || !fits(map, next, size, walls) || touchesAvoid(next)) continue;

        seen.set(key, nextCost);
        parent.set(key, cur);
        (buckets[nextCost] ??= []).push(next);

        if (fits(map, next, size, taken)) result.set(key, nextCost);
        else result.delete(key);
      }
    }
  }

  return { cost: result, parent };
}

/** Учасник ДМ (не персонаж гравця) у його хід ходить без ліміту швидкості (як фігура на столі); решта — залишок руху. dmUserId — id ДМ, якщо ходить ДМ, інакше null. */
export function moveBudget({ map, dmUserId }: { map: BattleMapConfig; dmUserId: string | null }, p: BattleParticipant): number {
  if (dmUserId === null || !controlledByDm(p, dmUserId) || hasEffectMarker(p, EffectMarker.IMMOBILIZED)) return remainingMovement(p);

  return map.cols * map.rows;
}

/** Наляканий не може наблизитись до живого джерела страху. */
export function frightenedBlocksMove(map: BattleMapConfig | null | undefined, participants: BattleParticipant[], mover: BattleParticipant, to: GridPoint): boolean {
  if (!map) return false;

  const sources = conditionSourceIds(mover, "frightened");

  if (!sources.length) return false;

  const destination = footprint(to, sizeOf(mover));

  return participants.some(
    (p) => sources.includes(p.basicInfo.id) && isActive(p) && isOnMap(p) && footprintDistance(destination, cellsOf(p)) < footprintDistance(cellsOf(mover), cellsOf(p)),
  );
}
