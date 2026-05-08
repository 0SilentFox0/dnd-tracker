/**
 * Логіка обробки атаки: валідація цілей, processAttack по кожній цілі, оновлення моралі, збереження.
 */

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { processAttack } from "@/lib/utils/battle/attack";
import { getTotalDiceCount } from "@/lib/utils/battle/balance";
import {
  prepareBattleLogForStorage,
  preparePusherPayload,
  slimInitiativeOrderForStorage,
  stripStateBeforeForClient,
} from "@/lib/utils/battle/strip-battle-payload";
import { updateMoraleOnEvent } from "@/lib/utils/skills/execution";
import type { BattleAction, BattleParticipant } from "@/types/battle";

export interface AttackHandlerInput {
  battle: {
    id: string;
    campaignId: string;
    status: string;
    currentTurnIndex: number;
    currentRound: number;
    initiativeOrder: unknown;
    battleLog: unknown;
  };
  battleId: string;
  data: {
    attackerId: string;
    targetIds: string[];
    attackId?: string;
    d20Roll: number;
    advantageRoll?: number;
    disadvantageRoll?: number;
    damageRolls: number[];
    /** Урон відповіді цілі (контратака), для однієї цілі */
    reactionDamage?: number;
  };
}

export async function executeAttack({
  battle,
  battleId,
  data,
}: AttackHandlerInput): Promise<unknown> {
  const initiativeOrder = battle.initiativeOrder as unknown as BattleParticipant[];

  const attacker = initiativeOrder.find((p) => p.basicInfo.id === data.attackerId);

  if (!attacker) throw new Error("Attacker not found");

  const targetIds = data.targetIds || [];

  const targets = initiativeOrder.filter((p) => targetIds.includes(p.basicInfo.id));

  if (targets.length === 0) throw new Error("No targets found in battle");

  const currentParticipant = initiativeOrder[battle.currentTurnIndex];

  if (!currentParticipant || currentParticipant.basicInfo.id !== attacker.basicInfo.id) {
    throw new Error("It is not attacker's turn");
  }

  if (attacker.actionFlags.hasUsedAction) {
    throw new Error("Attacker has already used their action");
  }

  if (attacker.combatStats.status !== "active") {
    throw new Error("Attacker is not active (unconscious or dead)");
  }

  let attack = data.attackId
    ? attacker.battleData.attacks.find(
        (a) => a.id === data.attackId || a.name === data.attackId,
      )
    : null;

  if (!attack) attack = attacker.battleData.attacks[0];

  if (!attack) throw new Error("No attack available");

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
    throw new Error(`Too many targets. Max allowed: ${maxPossibleTargets}`);
  }

  const dist = attack.damageDistribution;

  const damageFractions: number[] =
    isMultiTargetRanged
      ? targets.map(() => 1)
      : dist &&
          dist.length === targets.length &&
          dist.every((n) => typeof n === "number" && n >= 0 && n <= 100)
        ? (() => {
            const sum = dist.reduce((a, b) => a + b, 0);

            return sum > 0 ? dist.map((p) => p / sum) : targets.map(() => 1 / targets.length);
          })()
        : targets.map(() => 1 / targets.length);

  let currentAttacker = { ...attacker };

  let currentInitiativeOrder: BattleParticipant[] = initiativeOrder.map((p) => ({
    ...p,
    battleData: p.battleData
      ? { ...p.battleData, skillUsageCounts: { ...(p.battleData.skillUsageCounts ?? {}) } }
      : p.battleData,
  }));

  const allBattleActions: BattleAction[] = [];

  const battleLog = (battle.battleLog as unknown as BattleAction[]) || [];

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

    const damageMultiplier = targets.length > 1 ? damageFractions[i] : undefined;

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
      d20Roll: data.d20Roll,
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
    currentInitiativeOrder = currentInitiativeOrder.map((p) => {
      if (p.basicInfo.id === currentAttacker.basicInfo.id) return currentAttacker as BattleParticipant;

      if (p.basicInfo.id === target.basicInfo.id) return attackResult.targetUpdated as BattleParticipant;

      return p;
    });

    const battleAction: BattleAction = {
      ...attackResult.battleAction,
      actionIndex: battleLog.length + allBattleActions.length,
      stateBefore: { ...stateBefore },
    };

    allBattleActions.push(battleAction);
    stateBefore = snapshotState();
  }

  let finalInitiativeOrder = currentInitiativeOrder;

  for (const target of targets) {
    const currentTarget = finalInitiativeOrder.find((p) => p.basicInfo.id === target.basicInfo.id);

    if (
      currentTarget &&
      (currentTarget.combatStats.status === "dead" || currentTarget.combatStats.status === "unconscious")
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

  const updatedBattle = await prisma.battleScene.update({
    where: { id: battleId },
    data: {
      initiativeOrder: slimInitiativeOrderForStorage(finalInitiativeOrder) as unknown as Prisma.InputJsonValue,
      battleLog: prepareBattleLogForStorage([...battleLog, ...allBattleActions]) as unknown as Prisma.InputJsonValue,
    },
  });

  if (process.env.PUSHER_APP_ID) {
    const { pusherServer } = await import("@/lib/pusher");

    void pusherServer
      .trigger(`battle-${battleId}`, "battle-updated", preparePusherPayload(updatedBattle))
      .catch((err) => console.error("Pusher trigger failed:", err));
  }

  return stripStateBeforeForClient(updatedBattle);
}
