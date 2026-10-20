import { footprintDistance } from "./geometry";
import { cellsOf, isOnMap } from "./occupancy";

import { AttackType, CELL_FEET } from "@/lib/constants/battle";
import { MAZE_TEXTS } from "@/lib/constants/maze-texts";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { inMazePlay, mazeGridOf, meleeWallBetween, seesTarget } from "@/lib/utils/battle/maze";
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

  const maze = mazeGridOf(map);

  if (attackKindOf(attack.type) === AttackType.MELEE) {
    if (placed.some((t) => distanceTo(t) > 1)) return "Ціль не поруч — спершу підійдіть";

    return maze && placed.some((t) => meleeWallBetween(maze, attacker, t)) ? MAZE_TEXTS.wallBetween : null;
  }

  // у лабіринті сплячий ворог чи ворог за стіною не заважає стріляти (і не видає себе помилкою)
  const engages = (p: BattleParticipant) => (maze ? inMazePlay(p) && !meleeWallBetween(maze, attacker, p) : isActive(p));

  const engaged = participants.some((p) => p.basicInfo.side !== attacker.basicInfo.side && isOnMap(p) && distanceTo(p) <= 1 && engages(p));

  if (engaged) return "Поруч ворог — стріляти не можна";

  const range = attackRangeCells(attack.range);

  if (range !== null && placed.some((t) => distanceTo(t) > range)) return "Ціль поза дальністю атаки";

  return maze && placed.some((t) => !seesTarget(maze, attacker, t)) ? MAZE_TEXTS.targetOutOfSight : null;
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

  let meleeError: string | null = null;

  let rangedError: string | null = null;

  for (const attack of [...attacks.filter(isMelee), ...attacks.filter((a) => !isMelee(a))]) {
    const e = attackReachError(map, participants, attacker, attack, [target]);

    if (e === null) return { attack, error: null };

    if (isMelee(attack)) meleeError ??= e;
    else rangedError ??= e;
  }

  // до далекої цілі «підійдіть» менш корисне, ніж причина, чому не стріляє лук
  const adjacent = !!target.battleData.position && footprintDistance(cellsOf(attacker), cellsOf(target)) <= 1;

  return { attack: null, error: adjacent ? (meleeError ?? rangedError) : (rangedError ?? meleeError) };
}
