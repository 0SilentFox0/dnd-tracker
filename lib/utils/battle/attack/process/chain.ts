import { isDormant, isTargetable } from "@/lib/utils/abilities/engine/core/participants";
import { attackRangeCells, cellsOf, footprintDistance, isOnMap, nearestTo } from "@/lib/utils/battle/grid";
import { modeSees } from "@/lib/utils/battle/modes/engine";
import type { BattleAttack, BattleMapConfig, BattleParticipant } from "@/types/battle";

export interface ChainStep {
  map: BattleMapConfig | null | undefined;
  order: BattleParticipant[];
  attacker: BattleParticipant;
  attack: BattleAttack;
  /** Попередня ціль (може бути вже мертвою — стрибок іде від її клітинки). */
  from: BattleParticipant;
  hit: ReadonlySet<string>;
}

export function nextChainTarget({ map, order, attacker, attack, from, hit }: ChainStep): BattleParticipant | undefined {
  const range = attackRangeCells(attack.range);

  const origin = cellsOf(from);

  const inRange = (p: BattleParticipant) => !map || range === null || origin.length === 0 || !isOnMap(p) || footprintDistance(origin, cellsOf(p)) <= range;

  const candidates = order.filter(
    (p) => p.basicInfo.side !== attacker.basicInfo.side && !hit.has(p.basicInfo.id) && isTargetable(p) && !isDormant(p) && modeSees(map, attacker, p) && inRange(p),
  );

  return map ? nearestTo(from, candidates) : candidates[0];
}
