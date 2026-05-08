/**
 * Runs the attack phase: validation, processAttack per target, morale updates.
 * Used by attack-and-next-turn route (and can be reused by attack route).
 */

import { processAttack } from "@/lib/utils/battle/attack";
import { getTotalDiceCount } from "@/lib/utils/battle/balance";
import { slimInitiativeOrderForStorage } from "@/lib/utils/battle/strip-battle-payload";
import { updateMoraleOnEvent } from "@/lib/utils/skills/execution";
import type { BattleAction, BattleParticipant } from "@/types/battle";

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
    advantageRoll?: number;
    disadvantageRoll?: number;
    damageRolls: number[];
    reactionDamage?: number;
  };
  battleId: string;
  userId: string;
  isDM: boolean;
};

export type AttackPhaseResult = {
  finalInitiativeOrder: BattleParticipant[];
  allBattleActions: BattleAction[];
  baseBattleLog: BattleAction[];
};

export class AttackPhaseError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "AttackPhaseError";
  }
}

export function runAttackPhase(input: AttackPhaseInput): AttackPhaseResult {
  const { battle, data, battleId, userId, isDM } = input;

  const initiativeOrder = battle.initiativeOrder as BattleParticipant[];

  const baseBattleLog = (battle.battleLog as BattleAction[]) || [];

  const singleRoll = data.d20Roll ?? data.attackRoll;

  const targetIds = data.targetIds || (data.targetId ? [data.targetId] : []);

  const targets = initiativeOrder.filter((p) =>
    targetIds.includes(p.basicInfo.id),
  );

  const usePerTargetRolls =
    Array.isArray(data.attackRolls) &&
    data.attackRolls.length === targets.length;

  if (!singleRoll && !usePerTargetRolls) {
    throw new AttackPhaseError("d20Roll, attackRoll or attackRolls required", 400);
  }

  const attacker = initiativeOrder.find(
    (p) => p.basicInfo.id === data.attackerId,
  );

  if (!attacker) {
    throw new AttackPhaseError("Attacker not found in battle", 404);
  }

  const currentParticipant = initiativeOrder[battle.currentTurnIndex];

  const canAttack =
    isDM ||
    (currentParticipant?.basicInfo.id === attacker.basicInfo.id &&
      attacker.basicInfo.controlledBy === userId);

  if (!canAttack) {
    throw new AttackPhaseError(
      "Forbidden: only DM or current turn controller can attack",
      403,
    );
  }

  if (targets.length === 0) {
    throw new AttackPhaseError("No targets found in battle", 404);
  }

  if (
    !currentParticipant ||
    currentParticipant.basicInfo.id !== attacker.basicInfo.id
  ) {
    throw new AttackPhaseError("It is not attacker's turn", 400);
  }

  if (attacker.actionFlags.hasUsedAction) {
    throw new AttackPhaseError("Attacker has already used their action", 400);
  }

  if (attacker.combatStats.status !== "active") {
    throw new AttackPhaseError(
      "Attacker is not active (unconscious or dead)",
      400,
    );
  }

  let attack = data.attackId
    ? attacker.battleData.attacks.find(
        (a) => a.id === data.attackId || a.name === data.attackId,
      )
    : null;

  if (!attack) attack = attacker.battleData.attacks[0];

  if (!attack) {
    throw new AttackPhaseError("No attack available", 400);
  }

  const isAoe = attack.targetType === "aoe";

  const isMultiTargetRanged =
    !isAoe &&
    attack.type === "ranged" &&
    (attacker.combatStats.maxTargets ?? 1) > 1;

  const maxPossibleTargets = isAoe
    ? attack.maxTargets || attacker.combatStats.maxTargets || 1
    : isMultiTargetRanged
      ? attacker.combatStats.maxTargets || 1
      : 1;

  if (targets.length > maxPossibleTargets) {
    throw new AttackPhaseError(
      `Too many targets. Max allowed: ${maxPossibleTargets}`,
      400,
    );
  }

  const dist = attack.damageDistribution;

  // Для multi-target ranged: кожна ціль отримує повний урон (окремий кидок на ціль)
  const damageFractions: number[] =
    isMultiTargetRanged
      ? targets.map(() => 1)
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

  let currentInitiativeOrder: BattleParticipant[] = initiativeOrder.map(
    (p) => ({
      ...p,
      battleData: p.battleData
        ? {
            ...p.battleData,
            skillUsageCounts: { ...(p.battleData.skillUsageCounts ?? {}) },
          }
        : p.battleData,
    }),
  );

  const allBattleActions: BattleAction[] = [];

  const snapshotState = () => ({
    initiativeOrder: slimInitiativeOrderForStorage(
      structuredClone(currentInitiativeOrder),
    ),
    currentTurnIndex: battle.currentTurnIndex,
    currentRound: battle.currentRound,
  });

  let stateBefore = snapshotState();

  const dicePerTarget =
    isMultiTargetRanged && targets.length > 1
      ? getTotalDiceCount(attack.damageDice ?? "")
      : 0;

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];

    const d20Roll =
      usePerTargetRolls && data.attackRolls
        ? data.attackRolls[i]
        : singleRoll;

    if (d20Roll == null || d20Roll < 1 || d20Roll > 20) {
      throw new AttackPhaseError(
        `Invalid attack roll for target ${i + 1}`,
        400,
      );
    }

    const damageMultiplier =
      targets.length > 1 ? damageFractions[i] : undefined;

    const damageRollsForTarget =
      isMultiTargetRanged &&
      targets.length > 1 &&
      dicePerTarget > 0 &&
      data.damageRolls.length >= (i + 1) * dicePerTarget
        ? data.damageRolls.slice(i * dicePerTarget, (i + 1) * dicePerTarget)
        : data.damageRolls;

    const reactionOverride =
      targets.length === 1 && data.reactionDamage != null
        ? data.reactionDamage
        : undefined;

    const attackResult = processAttack({
      attacker: currentAttacker,
      target,
      attack,
      d20Roll,
      advantageRoll: data.advantageRoll,
      disadvantageRoll: data.disadvantageRoll,
      damageRolls: damageRollsForTarget,
      allParticipants: currentInitiativeOrder,
      currentRound: battle.currentRound,
      battleId,
      damageMultiplier,
      reactionDamageOverride: reactionOverride,
    });

    currentAttacker = attackResult.attackerUpdated;

    if (attackResult.allParticipantsUpdated?.length) {
      const updatedMap = new Map(
        attackResult.allParticipantsUpdated.map((p) => [p.basicInfo.id, p]),
      );

      currentInitiativeOrder = currentInitiativeOrder.map(
        (p) => updatedMap.get(p.basicInfo.id) ?? p,
      );
    } else {
      currentInitiativeOrder = currentInitiativeOrder.map((p) => {
        if (p.basicInfo.id === currentAttacker.basicInfo.id)
          return currentAttacker as BattleParticipant;

        if (p.basicInfo.id === target.basicInfo.id)
          return attackResult.targetUpdated as BattleParticipant;

        return p;
      });
    }

    allBattleActions.push({
      ...attackResult.battleAction,
      actionIndex: baseBattleLog.length + allBattleActions.length,
      stateBefore: { ...stateBefore },
    });
    stateBefore = snapshotState();
  }

  let finalInitiativeOrder = currentInitiativeOrder;

  for (const target of targets) {
    const currentTarget = finalInitiativeOrder.find(
      (p) => p.basicInfo.id === target.basicInfo.id,
    );

    if (
      currentTarget &&
      (currentTarget.combatStats.status === "dead" ||
        currentTarget.combatStats.status === "unconscious")
    ) {
      const allyResult = updateMoraleOnEvent(
        finalInitiativeOrder,
        "allyDeath",
        target.basicInfo.id,
      );

      finalInitiativeOrder = allyResult.updatedParticipants;
    }
  }

  const killResult = updateMoraleOnEvent(
    finalInitiativeOrder,
    "kill",
    currentAttacker.basicInfo.id,
  );

  finalInitiativeOrder = killResult.updatedParticipants;

  return {
    finalInitiativeOrder,
    allBattleActions,
    baseBattleLog,
  };
}
