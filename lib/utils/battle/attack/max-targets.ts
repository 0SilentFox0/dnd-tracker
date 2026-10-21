import { AttackType } from "@/lib/constants/battle";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

export function isCleave(attack: BattleAttack): boolean {
  return attack.targetType !== "aoe" && attackKindOf(attack.type) === AttackType.MELEE && (attack.maxTargets ?? 1) > 1;
}

/** Скільки цілей обирає гравець; автоцілі (ланцюг, розщеплення, пробивний, «бʼє всіх») — поза лімітом. */
export function attackMaxTargets(attacker: BattleParticipant, attack: BattleAttack, ctx: { chain: boolean; onMap: boolean }): number {
  if (attack.targetType === "aoe") return attack.maxTargets || attacker.combatStats.maxTargets || 1;

  if (attackKindOf(attack.type) === AttackType.MELEE) return isCleave(attack) && !ctx.onMap ? (attack.maxTargets ?? 1) : 1;

  if (ctx.chain) return 1;

  return Math.max(1, attack.maxTargets ?? attacker.combatStats.maxTargets ?? 1);
}
