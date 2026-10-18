import { footprintDistance } from "./geometry";
import { cellsOf, isOnMap } from "./occupancy";

import { AttackType, CELL_FEET } from "@/lib/constants/battle";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import type { BattleAttack, BattleMapConfig, BattleParticipant } from "@/types/battle";

export function attackRangeCells(range?: string): number | null {
  const numbers = range?.match(/\d+/g);

  if (!numbers) return null;

  return Math.max(1, Math.floor(Number(numbers[numbers.length - 1]) / CELL_FEET));
}

export function attackReachError(
  map: BattleMapConfig | null,
  participants: BattleParticipant[],
  attacker: BattleParticipant,
  attack: BattleAttack,
  targets: BattleParticipant[],
  options: { ignoreReach?: boolean } = {},
): string | null {
  if (!map || !attacker.battleData.position || options.ignoreReach || attack.targetType === "aoe") return null;

  const mine = cellsOf(attacker);

  const distanceTo = (p: BattleParticipant) => footprintDistance(mine, cellsOf(p));

  const placed = targets.filter((t) => t.battleData.position);

  if (attackKindOf(attack.type) === AttackType.MELEE) {
    return placed.some((t) => distanceTo(t) > 1) ? "Ціль не поруч — спершу підійдіть" : null;
  }

  const engaged = participants.some((p) => p.basicInfo.side !== attacker.basicInfo.side && isActive(p) && isOnMap(p) && distanceTo(p) <= 1);

  if (engaged) return "Поруч ворог — стріляти не можна";

  const range = attackRangeCells(attack.range);

  return range !== null && placed.some((t) => distanceTo(t) > range) ? "Ціль поза дальністю атаки" : null;
}
