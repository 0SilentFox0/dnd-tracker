import { API_ERRORS } from "@/lib/constants/api-errors";
import { AttackType } from "@/lib/constants/battle";
import { findParticipant, isAirborne } from "@/lib/utils/abilities/engine/core/participants";
import { getDisabledAttackKinds } from "@/lib/utils/battle/attack/disabled-attacks";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { type ActorScope, requireActor } from "@/lib/utils/battle/common/control";
import { conditionSourceIds } from "@/lib/utils/battle/conditions/query";
import { BattleAccessError, BattleRuleError } from "@/lib/utils/battle/store/errors";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

export interface AttackRequest {
  attackerId: string;
  targetId?: string;
  targetIds?: string[];
  attackId?: string;
  d20Roll?: number;
  attackRoll?: number;
  /** Один кидок на ціль (для multi-target); якщо length === targets.length, використовується для кожної цілі */
  attackRolls?: number[];
  /** Сирі другі d20 на ціль (null — без другого); сервер вирішує перевагу/недолік сам */
  secondRolls?: (number | null)[];
  advantageRoll?: number;
  disadvantageRoll?: number;
  rollMode?: "normal" | "advantage" | "disadvantage";
  damageRolls: number[];
}

export function requestedTargetIds(data: Pick<AttackRequest, "targetId" | "targetIds">): string[] {
  if (data.targetIds?.length) return data.targetIds;

  return data.targetId ? [data.targetId] : [];
}

export function findAttack(attacker: BattleParticipant, attackId: string | undefined): BattleAttack | undefined {
  const { attacks } = attacker.battleData;

  return (attackId ? attacks.find((a) => a.id === attackId || a.name === attackId) : undefined) ?? attacks[0];
}

export interface ValidatedAttackRequest {
  attacker: BattleParticipant;
  attack: BattleAttack;
  targetIds: string[];
  chosenTargets: BattleParticipant[];
  singleRoll: number | undefined;
  usePerTargetRolls: boolean;
}

export function validateAttackRequest(scope: ActorScope, data: AttackRequest): ValidatedAttackRequest {
  const order = scope.participants;

  const singleRoll = data.d20Roll ?? data.attackRoll;

  const targetIds = requestedTargetIds(data);

  const chosenTargets = [...new Set(targetIds)].flatMap((id) => findParticipant(order, id) ?? []);

  const usePerTargetRolls = Array.isArray(data.attackRolls) && data.attackRolls.length === chosenTargets.length;

  if (!singleRoll && !usePerTargetRolls) {
    throw new BattleRuleError("action_rejected", "Потрібен кидок d20 (d20Roll, attackRoll або attackRolls)");
  }

  const attacker = requireActor(scope, data.attackerId, {
    missing: "Атакуючого немає в бою",
    forbidden: "Атакувати може лише DM або той, хто зараз ходить",
    inactive: { code: "action_rejected", message: "Атакуючий не може діяти (непритомний або мертвий)" },
  });

  if (chosenTargets.length === 0) throw new BattleAccessError(404, "Цілей немає в бою");

  if (chosenTargets.some(isAirborne)) throw new BattleRuleError("invalid_target", API_ERRORS.TARGET_AIRBORNE);

  if (order[scope.scene.turnIndex]?.basicInfo.id !== attacker.basicInfo.id) {
    throw new BattleRuleError("action_rejected", "Зараз не хід атакуючого");
  }

  if (attacker.actionFlags.hasUsedAction) throw new BattleRuleError("action_used", API_ERRORS.ACTION_USED);

  const attack = findAttack(attacker, data.attackId);

  if (!attack) throw new BattleRuleError("action_rejected", "У атакуючого немає доступної атаки");

  const attackKind = attackKindOf(attack.type);

  if (getDisabledAttackKinds(attacker)[attackKind]) {
    throw new BattleRuleError("action_rejected", attackKind === AttackType.RANGED ? "Атакуючий не може атакувати здалеку" : "Атакуючий не може атакувати в ближньому бою");
  }

  const charmers = conditionSourceIds(attacker, "charmed");

  if (chosenTargets.some((t) => charmers.includes(t.basicInfo.id))) {
    throw new BattleRuleError("invalid_target", `${attacker.basicInfo.name} не може атакувати того, хто його зачарував`);
  }

  return { attacker, attack, targetIds, chosenTargets, singleRoll, usePerTargetRolls };
}
