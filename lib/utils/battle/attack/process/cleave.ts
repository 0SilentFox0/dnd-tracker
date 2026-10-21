import { findParticipant, isDormant, isTargetable } from "@/lib/utils/abilities/engine/core/participants";
import { bothOnMap, cellsOf, footprintDistance, isOnMap } from "@/lib/utils/battle/grid";
import { modeMeleeBlockedText } from "@/lib/utils/battle/modes/engine";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

/** Додаткові цілі багатоголової атаки: вороги поруч і з атакуючим, і з ціллю, за ініціативою. */
export function cleaveTargets(map: BattleMapConfig | null | undefined, order: BattleParticipant[], attacker: BattleParticipant, target: BattleParticipant, count: number): BattleParticipant[] {
  if (count <= 0 || !bothOnMap(map, attacker, target)) return [];

  const mine = cellsOf(attacker);

  const theirs = cellsOf(findParticipant(order, target.basicInfo.id) ?? target);

  return order
    .filter(
      (p) =>
        p.basicInfo.id !== target.basicInfo.id &&
        p.basicInfo.side !== attacker.basicInfo.side &&
        isTargetable(p) &&
        !isDormant(p) &&
        isOnMap(p) &&
        footprintDistance(mine, cellsOf(p)) <= 1 &&
        footprintDistance(theirs, cellsOf(p)) <= 1 &&
        modeMeleeBlockedText(map, attacker, p) === null,
    )
    .slice(0, count);
}
