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
): string | null {
  if (!map || !attacker.battleData.position) return null;

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

export function enemiesInReach(map: BattleMapConfig | null, participants: BattleParticipant[], attacker: BattleParticipant, attack: BattleAttack): BattleParticipant[] {
  return participants.filter(
    (p) => p.basicInfo.side !== attacker.basicInfo.side && isActive(p) && isOnMap(p) && attackReachError(map, participants, attacker, attack, [p]) === null,
  );
}

/** Ближня атака, якщо дістає; інакше перша досяжна. Без карти чи позиції — перша ближня, інакше перша. */
export function pickAttack(
  map: BattleMapConfig | null,
  participants: BattleParticipant[],
  attacker: BattleParticipant,
  attacks: BattleAttack[],
  target: BattleParticipant,
): { attack: BattleAttack | null; error: string | null } {
  const isMelee = (a: BattleAttack) => attackKindOf(a.type) === AttackType.MELEE;

  let error: string | null = null;

  for (const attack of [...attacks.filter(isMelee), ...attacks.filter((a) => !isMelee(a))]) {
    const e = attackReachError(map, participants, attacker, attack, [target]);

    if (e === null) return { attack, error: null };

    error ??= e;
  }

  return { attack: null, error };
}
