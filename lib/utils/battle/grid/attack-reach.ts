import { footprintDistance } from "./geometry";
import { cellsOf, isOnMap } from "./occupancy";

import { AttackType, CELL_FEET } from "@/lib/constants/battle";
import { isAttackable } from "@/lib/utils/abilities/engine/core/participants";
import { hasTrait, isFiveE } from "@/lib/utils/battle/attack/ability";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { modeEngages, modeMeleeBlockedText, modeTargetHiddenText } from "@/lib/utils/battle/modes/engine";
import type { BattleAttack, BattleMapConfig, BattleParticipant } from "@/types/battle";

export function attackRangeCells(range?: string): number | null {
  return rangeBands(range)?.long ?? null;
}

export function meleeReachCells(p: BattleParticipant, attack: BattleAttack): number {
  return isFiveE(p) && hasTrait(attack, "reach") ? 2 : 1;
}

export function rangeBands(range: string | undefined): { normal: number; long: number } | null {
  const numbers = range?.match(/\d+/g);

  if (!numbers) return null;

  const cells = (n: string) => Math.max(1, Math.floor(Number(n) / CELL_FEET));

  return { normal: cells(numbers[0]), long: cells(numbers[numbers.length - 1]) };
}

const isThrownMelee = (attack: BattleAttack) => attackKindOf(attack.type) === AttackType.MELEE && hasTrait(attack, "thrown") && rangeBands(attack.range) !== null;

/** Причини перешкоди дальньої атаки 5e: «Далека дистанція», «Ворог поруч». HOMM — []. */
export function rangeDisadvantageReasons(
  map: BattleMapConfig | null | undefined,
  participants: BattleParticipant[],
  attacker: BattleParticipant,
  attack: BattleAttack,
  target: BattleParticipant,
): string[] {
  if (!map || !isFiveE(attacker) || !attacker.battleData.position || !target.battleData.position) return [];

  const mine = cellsOf(attacker);

  const distance = footprintDistance(mine, cellsOf(target));

  const thrown = isThrownMelee(attack) && distance > meleeReachCells(attacker, attack);

  if (attackKindOf(attack.type) !== AttackType.RANGED && !thrown) return [];

  const reasons: string[] = [];

  const bands = rangeBands(attack.range);

  if (bands && distance > bands.normal) reasons.push("Далека дистанція");

  const engaged = participants.some((p) => p.basicInfo.side !== attacker.basicInfo.side && isOnMap(p) && footprintDistance(mine, cellsOf(p)) <= 1 && modeEngages(map, attacker, p));

  if (engaged && !thrown) reasons.push("Ворог поруч");

  return reasons;
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

  const fiveE = isFiveE(attacker);

  if (attackKindOf(attack.type) === AttackType.MELEE) {
    const reach = meleeReachCells(attacker, attack);

    const bands = fiveE && isThrownMelee(attack) ? rangeBands(attack.range) : null;

    const tooFar = placed.find((t) => distanceTo(t) > reach);

    if (tooFar) {
      if (!bands) return "Ціль не поруч — спершу підійдіть";

      if (placed.some((t) => distanceTo(t) > bands.long)) return "Ціль поза дальністю атаки";

      return modeTargetHiddenText(map, attacker, placed);
    }

    return placed.map((t) => modeMeleeBlockedText(map, attacker, t)).find(Boolean) ?? null;
  }

  const engaged = !fiveE && participants.some((p) => p.basicInfo.side !== attacker.basicInfo.side && isOnMap(p) && distanceTo(p) <= 1 && modeEngages(map, attacker, p));

  if (engaged) return "Поруч ворог — стріляти не можна";

  const range = attackRangeCells(attack.range);

  if (range !== null && placed.some((t) => distanceTo(t) > range)) return "Ціль поза дальністю атаки";

  return modeTargetHiddenText(map, attacker, placed);
}

export function enemiesInReach(map: BattleMapConfig | null, participants: BattleParticipant[], attacker: BattleParticipant, attack: BattleAttack): BattleParticipant[] {
  return participants.filter(
    (p) => p.basicInfo.side !== attacker.basicInfo.side && isAttackable(p) && isOnMap(p) && attackReachError(map, participants, attacker, attack, [p]) === null,
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

  const usable = attacks.filter((a) => a.hand !== "off");

  let meleeError: string | null = null;

  let rangedError: string | null = null;

  for (const attack of [...usable.filter(isMelee), ...usable.filter((a) => !isMelee(a))]) {
    const e = attackReachError(map, participants, attacker, attack, [target]);

    if (e === null) return { attack, error: null };

    if (isMelee(attack)) meleeError ??= e;
    else rangedError ??= e;
  }

  // до далекої цілі «підійдіть» менш корисне, ніж причина, чому не стріляє лук
  const adjacent = !!target.battleData.position && footprintDistance(cellsOf(attacker), cellsOf(target)) <= 1;

  return { attack: null, error: adjacent ? (meleeError ?? rangedError) : (rangedError ?? meleeError) };
}
