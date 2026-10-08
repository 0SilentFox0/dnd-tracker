import { holdBackNewEffects, restoreHeldBack } from "./hold-back";

import { AttackType } from "@/lib/constants/battle";
import { findFlags } from "@/lib/utils/abilities/engine/collect-modifiers";
import { isActive, mergeParticipants, updateParticipant, withSelf } from "@/lib/utils/abilities/engine/participants";
/**
 * Runs the attack phase: validation, processAttack per target, primary-target retaliation.
 * Used by the attack route.
 */
import type { Rng } from "@/lib/utils/abilities/engine/types";
import { processAttack } from "@/lib/utils/battle/attack";
import { activeEffectIds } from "@/lib/utils/battle/attack/consume-effects";
import { resolveRetaliation } from "@/lib/utils/battle/attack/retaliation";
import { heroAttackDamageParts } from "@/lib/utils/battle/damage/hero-damage";
import { BattleAccessError, BattleRuleError } from "@/lib/utils/battle/store";
import { diceCount, rollDiceList } from "@/lib/utils/common/dice";
import type { ActiveEffect, BattleAction, BattleParticipant } from "@/types/battle";

export type AttackPhaseInput = {
  battle: {
    initiativeOrder: unknown;
    battleLog: unknown;
    currentRound: number;
    currentTurnIndex: number;
  };
  data: {
    attackerId: string;
    targetId?: string;
    targetIds?: string[];
    attackId?: string;
    d20Roll?: number;
    attackRoll?: number;
    /** Один кидок на ціль (для multi-target); якщо length === targets.length, використовується для кожної цілі */
    attackRolls?: number[];
    /** Сирі другі d20 на ціль; сервер вирішує перевагу/недолік сам */
    secondRolls?: number[];
    advantageRoll?: number;
    disadvantageRoll?: number;
    damageRolls: number[];
  };
  battleId: string;
  userId: string;
  isDM: boolean;
  rng?: Rng;
};

export type AttackPhaseResult = {
  finalInitiativeOrder: BattleParticipant[];
  allBattleActions: BattleAction[];
  baseBattleLog: BattleAction[];
};

export function runAttackPhase(input: AttackPhaseInput): AttackPhaseResult {
  const { battle, data, battleId, userId, isDM } = input;

  const rng = input.rng ?? Math.random;

  const initiativeOrder = battle.initiativeOrder as BattleParticipant[];

  const baseBattleLog = (battle.battleLog as BattleAction[]) || [];

  const singleRoll = data.d20Roll ?? data.attackRoll;

  const targetIds = data.targetIds || (data.targetId ? [data.targetId] : []);

  const chosenTargets = initiativeOrder.filter((p) =>
    targetIds.includes(p.basicInfo.id),
  );

  const usePerTargetRolls =
    Array.isArray(data.attackRolls) &&
    data.attackRolls.length === chosenTargets.length;

  if (!singleRoll && !usePerTargetRolls) {
    throw new BattleRuleError("action_rejected", "Потрібен кидок d20 (d20Roll, attackRoll або attackRolls)");
  }

  const attacker = initiativeOrder.find(
    (p) => p.basicInfo.id === data.attackerId,
  );

  if (!attacker) {
    throw new BattleAccessError(404, "Атакуючого немає в бою");
  }

  const currentParticipant = initiativeOrder[battle.currentTurnIndex];

  const canAttack =
    isDM ||
    (currentParticipant?.basicInfo.id === attacker.basicInfo.id &&
      attacker.basicInfo.controlledBy === userId);

  if (!canAttack) {
    throw new BattleAccessError(403, "Атакувати може лише DM або той, хто зараз ходить");
  }

  if (chosenTargets.length === 0) {
    throw new BattleAccessError(404, "Цілей немає в бою");
  }

  if (
    !currentParticipant ||
    currentParticipant.basicInfo.id !== attacker.basicInfo.id
  ) {
    throw new BattleRuleError("action_rejected", "Зараз не хід атакуючого");
  }

  if (attacker.actionFlags.hasUsedAction) {
    throw new BattleRuleError("action_rejected", "Атакуючий уже використав дію");
  }

  if (!isActive(attacker)) {
    throw new BattleRuleError("action_rejected", "Атакуючий не може діяти (непритомний або мертвий)");
  }

  let attack = data.attackId
    ? attacker.battleData.attacks.find(
        (a) => a.id === data.attackId || a.name === data.attackId,
      )
    : null;

  if (!attack) attack = attacker.battleData.attacks[0];

  if (!attack) {
    throw new BattleRuleError("action_rejected", "У атакуючого немає доступної атаки");
  }

  const isAoe = attack.targetType === "aoe";

  const hitsAllEnemies = findFlags(withSelf(initiativeOrder, attacker), attacker.basicInfo.id, "attackHitsAllEnemies").length > 0;

  const targets = hitsAllEnemies
    ? [
        ...chosenTargets.filter((t) => t.basicInfo.side !== attacker.basicInfo.side && isActive(t)),
        ...initiativeOrder.filter((t) => t.basicInfo.side !== attacker.basicInfo.side && isActive(t) && !targetIds.includes(t.basicInfo.id)),
      ]
    : chosenTargets;

  if (targets.length === 0) {
    throw new BattleAccessError(404, "Цілей немає в бою");
  }

  const isMultiTargetRanged =
    hitsAllEnemies ||
    (!isAoe &&
      attack.type === AttackType.RANGED &&
      (attacker.combatStats.maxTargets ?? 1) > 1);

  const maxPossibleTargets = hitsAllEnemies
    ? targets.length
    : isAoe
      ? attack.maxTargets || attacker.combatStats.maxTargets || 1
      : isMultiTargetRanged
        ? attacker.combatStats.maxTargets || 1
        : 1;

  const chosenIndex = (id: string) => chosenTargets.findIndex((t) => t.basicInfo.id === id);

  if (targets.length > maxPossibleTargets) {
    throw new BattleRuleError("action_rejected", `Забагато цілей. Максимум: ${maxPossibleTargets}`);
  }

  const dist = attack.damageDistribution;

  const falloffPercents = hitsAllEnemies ? [] : findFlags(withSelf(initiativeOrder, attacker), attacker.basicInfo.id, "multiTargetFalloff").map((f) => f.percent);

  const falloff = falloffPercents.length > 0 ? Math.min(...falloffPercents) / 100 : 1;

  // Для multi-target ranged: окремий кидок на ціль; основна ціль — повна шкода, додаткові — за falloff
  const damageFractions: number[] =
    isMultiTargetRanged
      ? targets.map((_, i) => (i === 0 ? 1 : falloff))
      : dist &&
          dist.length === targets.length &&
          dist.every((n) => typeof n === "number" && n >= 0 && n <= 100)
        ? (() => {
            const sum = dist.reduce((a, b) => a + b, 0);

            return sum > 0
              ? dist.map((p) => p / sum)
              : targets.map(() => 1 / targets.length);
          })()
        : targets.map(() => 1 / targets.length);

  let currentAttacker = { ...attacker };

  let currentInitiativeOrder: BattleParticipant[] = initiativeOrder;

  const allBattleActions: BattleAction[] = [];

  const dicePerTarget =
    isMultiTargetRanged && (targets.length > 1 || hitsAllEnemies)
      ? diceCount(hitsAllEnemies ? heroAttackDamageParts(attacker, attack).formula : (attack.damageDice ?? ""))
      : 0;

  let damageCursor = 0;

  let grantedExtra = false;

  const effectsBeforeVolley = activeEffectIds([attacker]);

  const heldBack: ActiveEffect[] = [];

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];

    const chosenAt = hitsAllEnemies ? chosenIndex(target.basicInfo.id) : i;

    const d20Roll = hitsAllEnemies
      ? ((usePerTargetRolls && chosenAt >= 0 ? data.attackRolls?.[chosenAt] : singleRoll) ?? Math.floor(rng() * 20) + 1)
      : usePerTargetRolls && data.attackRolls
        ? data.attackRolls[i]
        : singleRoll;

    if (d20Roll == null || d20Roll < 1 || d20Roll > 20) {
      throw new BattleRuleError("action_rejected", `Некоректний кидок атаки для цілі ${i + 1}`);
    }

    const damageMultiplier =
      targets.length > 1 ? damageFractions[i] : undefined;

    const sentRolls = hitsAllEnemies ? data.damageRolls.slice(damageCursor, damageCursor + dicePerTarget) : [];

    const rolledByServer = hitsAllEnemies && sentRolls.length < dicePerTarget;

    const damageRollsForTarget = hitsAllEnemies
      ? rolledByServer
        ? [...sentRolls, ...rollDiceList(heroAttackDamageParts(attacker, attack).formula, rng).slice(sentRolls.length)]
        : sentRolls
      : isMultiTargetRanged &&
          targets.length > 1 &&
          dicePerTarget > 0 &&
          data.damageRolls.length >= (i + 1) * dicePerTarget
        ? data.damageRolls.slice(i * dicePerTarget, (i + 1) * dicePerTarget)
        : data.damageRolls;

    const freshTarget = currentInitiativeOrder.find((p) => p.basicInfo.id === target.basicInfo.id) ?? target;

    const attackResult = processAttack({
      attacker: currentAttacker,
      target: freshTarget,
      attack,
      d20Roll,
      advantageRoll: data.secondRolls?.[chosenAt] ?? data.advantageRoll,
      disadvantageRoll: data.secondRolls?.[chosenAt] ?? data.disadvantageRoll,
      damageRolls: damageRollsForTarget,
      allParticipants: currentInitiativeOrder,
      currentRound: battle.currentRound,
      battleId,
      damageMultiplier,
      rng,
    });

    if (hitsAllEnemies && attackResult.success) damageCursor += dicePerTarget;

    currentInitiativeOrder = mergeParticipants(currentInitiativeOrder, attackResult.allParticipantsUpdated ?? []);
    currentAttacker = attackResult.attackerUpdated;

    const critType = attackResult.criticalEffectApplied?.effect.type;

    if (critType === "free_attack" || critType === "combo_attack") grantedExtra = true;

    if (rolledByServer && attackResult.success) {
      attackResult.battleAction.resultText = `${attackResult.battleAction.resultText} | 🎲 кубики шкоди кинув сервер: ${damageRollsForTarget.slice(sentRolls.length).join(", ")}`;
    }

    allBattleActions.push({
      ...attackResult.battleAction,
      actionIndex: baseBattleLog.length + allBattleActions.length,
    });

    const provoked = critType === "provoke_opportunity_attack";

    if (i === 0 || provoked) {
      const retaliation = resolveRetaliation({
        participants: currentInitiativeOrder,
        attackerId: attacker.basicInfo.id,
        defenderId: target.basicInfo.id,
        attack,
        attackRoll: attackResult.attackRoll,
        criticalEffect: attackResult.criticalEffectApplied,
        provoked,
        round: battle.currentRound,
        battleId,
        rng,
      });

      if (retaliation) {
        currentInitiativeOrder = mergeParticipants(currentInitiativeOrder, retaliation.participants);
        currentAttacker = retaliation.participants.find((p) => p.basicInfo.id === attacker.basicInfo.id) ?? currentAttacker;
        allBattleActions.push({
          ...retaliation.battleAction,
          actionIndex: baseBattleLog.length + allBattleActions.length,
        });
      }
    }

    const held = holdBackNewEffects(currentInitiativeOrder, currentAttacker, effectsBeforeVolley);

    currentInitiativeOrder = held.order;
    currentAttacker = held.attacker;
    heldBack.push(...held.held);

    if (!isActive(currentAttacker)) break;
  }

  currentInitiativeOrder = restoreHeldBack(currentInitiativeOrder, attacker.basicInfo.id, heldBack);

  if (grantedExtra) {
    currentInitiativeOrder = updateParticipant(currentInitiativeOrder, attacker.basicInfo.id, (p) => ({ ...p, actionFlags: { ...p.actionFlags, hasUsedAction: false } }));
  }

  const finalInitiativeOrder = currentInitiativeOrder;

  return {
    finalInitiativeOrder,
    allBattleActions,
    baseBattleLog,
  };
}
