/**
 * Повна обробка атаки з усіма модифікаторами та ефектами
 */

import {
  applyCriticalEffect,
  AttackRollResult,
  calculateAttackRoll,
  canPerformReaction,
  performReaction,
} from "./battle-attack";
import { calculateDamageWithModifiers } from "./battle-damage-calculations";
import { applyResistance } from "./battle-resistance";
import {
  checkTriggerCondition,
  getPassiveAbilitiesByTrigger,
} from "./battle-triggers";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { BATTLE_CONSTANTS } from "@/lib/constants/battle";
import type { CriticalEffect } from "@/lib/constants/critical-effects";
import {
  executeAfterAttackTriggers,
  executeBeforeAttackTriggers,
} from "@/lib/utils/skills/skill-triggers-execution";
import { BattleAction, BattleAttack, BattleParticipant } from "@/types/battle";

/**
 * Параметри для обробки атаки
 */
export interface ProcessAttackParams {
  attacker: BattleParticipant;
  target: BattleParticipant;
  attack: BattleAttack;
  d20Roll: number;
  advantageRoll?: number; // для Advantage
  damageRolls: number[]; // результати кубиків урону
  allParticipants: BattleParticipant[];
  currentRound: number;
  battleId: string;
}

/**
 * Результат обробки атаки
 */
export interface ProcessAttackResult {
  success: boolean;
  attackRoll: AttackRollResult;
  damage?: {
    totalDamage: number;
    finalDamage: number; // фізичний + додатковий
    breakdown: string[];
    resistanceBreakdown: string[];
    additionalDamageBreakdown: string[];
  };
  targetUpdated: BattleParticipant;
  attackerUpdated: BattleParticipant;
  criticalEffectApplied?: CriticalEffect;
  reactionTriggered: boolean;
  reactionDamage?: number;
  battleAction: BattleAction;
}

/**
 * Повна обробка атаки
 */
export function processAttack(
  params: ProcessAttackParams,
): ProcessAttackResult {
  const {
    attacker,
    target,
    attack,
    d20Roll,
    advantageRoll,
    damageRolls,
    allParticipants,
    currentRound,
    battleId,
  } = params;

  let updatedAttacker = { ...attacker };

  let updatedTarget = { ...target };

  // Визначаємо чи це дія власника (для тригерів)
  const isOwnerAction = attacker.basicInfo.side === ParticipantSide.ALLY;

  // 0. Виконуємо тригери перед атакою
  const beforeAttackResult = executeBeforeAttackTriggers(
    updatedAttacker,
    updatedTarget,
    allParticipants,
    isOwnerAction,
  );

  updatedAttacker = beforeAttackResult.updatedAttacker;

  // 1. Розраховуємо Attack Roll
  const attackRoll = calculateAttackRoll(
    updatedAttacker,
    attack,
    d20Roll,
    advantageRoll,
  );

  // 2. Перевіряємо попадання (з урахуванням AC цілі)
  // Критичний промах (Natural 1) = автоматичний промах
  // Критичне попадання (Natural 20) = автоматичне попадання
  const isHit =
    !attackRoll.isCriticalFail &&
    (attackRoll.isCritical ||
      attackRoll.totalAttackValue >= updatedTarget.combatStats.armorClass);

  // Якщо критичний промах, застосовуємо негативний ефект та завершуємо
  if (attackRoll.isCriticalFail && attackRoll.criticalEffect) {
    const criticalEffectApplied = attackRoll.criticalEffect;

    updatedAttacker = applyCriticalEffect(
      updatedAttacker,
      criticalEffectApplied,
      currentRound,
    );

    const battleAction: BattleAction = {
      id: `attack-${attacker.basicInfo.id}-${Date.now()}`,
      battleId,
      round: currentRound,
      actionIndex: 0,
      timestamp: new Date(),
      actorId: attacker.basicInfo.id,
      actorName: attacker.basicInfo.name,
      actorSide: attacker.basicInfo.side,
      actionType: "attack",
      targets: [
        {
          participantId: target.basicInfo.id,
          participantName: target.basicInfo.name,
        },
      ],
      actionDetails: {
        weaponName: attack.name,
        attackRoll: d20Roll,
        attackBonus: attackRoll.attackBonus,
        totalAttackValue: attackRoll.totalAttackValue,
        targetAC: updatedTarget.combatStats.armorClass,
        isHit: false,
        isCritical: false,
        isCriticalFail: true,
      },
      resultText: `${attacker.basicInfo.name} критично промахнувся! ${criticalEffectApplied.description}`,
      hpChanges: [],
      isCancelled: false,
    };

    // Виконуємо тригери після атаки (навіть якщо критичний промах)
    const afterAttackResultFail = executeAfterAttackTriggers(
      updatedAttacker,
      updatedTarget,
      allParticipants,
      isOwnerAction,
    );

    updatedAttacker = afterAttackResultFail.updatedAttacker;

    // Позначаємо що атакуючий використав дію
    updatedAttacker.actionFlags.hasUsedAction = true;

    return {
      success: false,
      attackRoll,
      targetUpdated: updatedTarget,
      attackerUpdated: updatedAttacker,
      criticalEffectApplied,
      reactionTriggered: false,
      battleAction,
    };
  }

  if (!isHit) {
    // Промах - створюємо BattleAction та повертаємо
    const battleAction: BattleAction = {
      id: `attack-${attacker.basicInfo.id}-${Date.now()}`,
      battleId,
      round: currentRound,
      actionIndex: 0, // буде встановлено в route
      timestamp: new Date(),
      actorId: attacker.basicInfo.id,
      actorName: attacker.basicInfo.name,
      actorSide: attacker.basicInfo.side,
      actionType: "attack",
      targets: [
        {
          participantId: target.basicInfo.id,
          participantName: target.basicInfo.name,
        },
      ],
      actionDetails: {
        weaponName: attack.name,
        attackRoll: d20Roll,
        attackBonus: attackRoll.attackBonus,
        totalAttackValue: attackRoll.totalAttackValue,
        targetAC: updatedTarget.combatStats.armorClass,
        isHit: false,
        isCritical: false,
        isCriticalFail: attackRoll.isCriticalFail,
      },
      resultText: `${attacker.basicInfo.name} промахнувся по ${target.basicInfo.name}`,
      hpChanges: [],
      isCancelled: false,
    };

    // Виконуємо тригери після атаки (навіть якщо промах)
    const afterAttackResultMiss = executeAfterAttackTriggers(
      updatedAttacker,
      updatedTarget,
      allParticipants,
      isOwnerAction,
    );

    updatedAttacker = afterAttackResultMiss.updatedAttacker;

    // Позначаємо що атакуючий використав дію
    updatedAttacker.actionFlags.hasUsedAction = true;

    return {
      success: false,
      attackRoll,
      targetUpdated: updatedTarget,
      attackerUpdated: updatedAttacker,
      reactionTriggered: false,
      battleAction,
    };
  }

  // 3. Розраховуємо урон
  const baseDamage = damageRolls.reduce((sum, roll) => sum + roll, 0);

  const statModifier =
    attack.type === AttackType.MELEE
      ? Math.floor((updatedAttacker.abilities.strength - 10) / 2)
      : Math.floor((updatedAttacker.abilities.dexterity - 10) / 2);

  // Перевіряємо пасивки з тригером "on_attack" (до розрахунку урону)
  const onAttackAbilities = getPassiveAbilitiesByTrigger(
    updatedAttacker,
    "on_attack",
  );

  const additionalDamageModifiers: Array<{ type: string; value: number }> = [];

  for (const ability of onAttackAbilities) {
    if (
      checkTriggerCondition(ability.trigger, updatedAttacker, {
        target: updatedTarget,
        allParticipants,
      })
    ) {
      // Додаємо додаткові модифікатори урону (fire, poison, тощо)
      if (ability.effect.type === "additional_damage") {
        const modifierType =
          (ability.effect as { damageType?: string }).damageType || "fire";

        const modifierValue = ability.effect.value || 0;

        additionalDamageModifiers.push({
          type: modifierType,
          value: modifierValue,
        });
      }
    }
  }

  // Використовуємо нову функцію розрахунку урону
  const damageCalculation = calculateDamageWithModifiers(
    updatedAttacker,
    baseDamage,
    statModifier,
    attack.type as AttackType,
    {
      allParticipants,
      additionalDamage: additionalDamageModifiers,
    },
  );

  // 4. Застосовуємо критичний ефект (якщо є)
  let criticalEffectApplied: CriticalEffect | undefined;

  if (attackRoll.isCritical && attackRoll.criticalEffect) {
    criticalEffectApplied = attackRoll.criticalEffect;

    // Застосовуємо ефект до цілі або атакуючого залежно від типу
    if (criticalEffectApplied.effect.target === "target") {
      updatedTarget = applyCriticalEffect(
        updatedTarget,
        criticalEffectApplied,
        currentRound,
        updatedTarget,
      );
    } else if (criticalEffectApplied.effect.target === "self") {
      updatedAttacker = applyCriticalEffect(
        updatedAttacker,
        criticalEffectApplied,
        currentRound,
      );
    }

    // Для критичного попадання подвоюємо кількість кубиків
    // (це має бути зроблено в UI, але перевіряємо базовий урон)
    if (criticalEffectApplied.effect.type === "double_damage") {
      // Урон вже подвоєний через подвоєння кубиків в UI
    }
  }

  // 5. Застосовуємо опір/імунітет цілі для фізичного урону
  const resistanceResult = applyResistance(
    updatedTarget,
    damageCalculation.totalDamage,
    attack.damageType,
  );

  // 6. Застосовуємо опір/імунітет для додаткових модифікаторів урону (fire, poison, тощо)
  let totalAdditionalDamage = 0;

  const additionalDamageBreakdown: string[] = [];

  for (const additionalDamage of damageCalculation.additionalDamage) {
    const additionalResistance = applyResistance(
      updatedTarget,
      additionalDamage.value,
      additionalDamage.type,
    );

    totalAdditionalDamage += additionalResistance.finalDamage;
    additionalDamageBreakdown.push(...additionalResistance.breakdown);
  }

  // 7. Застосовуємо урон до цілі (фізичний + додатковий)
  const oldHp = updatedTarget.combatStats.currentHp;

  const totalFinalDamage = resistanceResult.finalDamage + totalAdditionalDamage;

  let remainingDamage = totalFinalDamage;

  // Спочатку віднімаємо з tempHp
  if (updatedTarget.combatStats.tempHp > 0 && remainingDamage > 0) {
    const tempDamage = Math.min(
      updatedTarget.combatStats.tempHp,
      remainingDamage,
    );

    updatedTarget.combatStats.tempHp -= tempDamage;
    remainingDamage -= tempDamage;
  }

  // Потім віднімаємо з currentHp
  updatedTarget.combatStats.currentHp = Math.max(
    BATTLE_CONSTANTS.MIN_DAMAGE,
    updatedTarget.combatStats.currentHp - remainingDamage,
  );

  // Оновлюємо статус
  if (updatedTarget.combatStats.currentHp <= 0) {
    updatedTarget.combatStats.status =
      updatedTarget.combatStats.currentHp < 0 ? "dead" : "unconscious";
  }

  // 8. Перевіряємо пасивки з тригером "on_hit" (після попадання)
  const onHitAbilities = getPassiveAbilitiesByTrigger(
    updatedAttacker,
    "on_hit",
  );

  for (const ability of onHitAbilities) {
    if (
      checkTriggerCondition(ability.trigger, updatedAttacker, {
        target: updatedTarget,
        allParticipants,
        damage: totalFinalDamage,
      })
    ) {
      // Застосовуємо ефект зі здібності
      // TODO: Реалізувати застосування ефектів
    }
  }

  // 9. Виконуємо тригери після атаки
  const afterAttackResult = executeAfterAttackTriggers(
    updatedAttacker,
    updatedTarget,
    allParticipants,
    isOwnerAction,
  );

  updatedAttacker = afterAttackResult.updatedAttacker;

  // 10. Перевіряємо контр-удар (Reaction)
  let reactionTriggered = false;

  let reactionDamage = 0;

  let reactionAttackerHpChange: {
    oldHp: number;
    newHp: number;
  } | null = null;

  if (canPerformReaction(updatedTarget)) {
    const reactionResult = performReaction(updatedTarget, updatedAttacker);

    reactionTriggered = true;
    reactionDamage = reactionResult.damage;
    // Оновлюємо defender (щоб позначити що реакцію використано)
    updatedTarget = reactionResult.updatedDefender;

    // Застосовуємо урон від контр-удару до атакуючого
    const oldAttackerHp = updatedAttacker.combatStats.currentHp;

    let remainingReactionDamage = reactionDamage;

    // Спочатку віднімаємо з tempHp
    if (updatedAttacker.combatStats.tempHp > 0 && remainingReactionDamage > 0) {
      const tempDamage = Math.min(
        updatedAttacker.combatStats.tempHp,
        remainingReactionDamage,
      );

      updatedAttacker.combatStats.tempHp -= tempDamage;
      remainingReactionDamage -= tempDamage;
    }

    // Потім віднімаємо з currentHp
    updatedAttacker.combatStats.currentHp = Math.max(
      BATTLE_CONSTANTS.MIN_DAMAGE,
      updatedAttacker.combatStats.currentHp - remainingReactionDamage,
    );

    // Оновлюємо статус
    if (updatedAttacker.combatStats.currentHp <= 0) {
      updatedAttacker.combatStats.status =
        updatedAttacker.combatStats.currentHp < 0 ? "dead" : "unconscious";
    }

    reactionAttackerHpChange = {
      oldHp: oldAttackerHp,
      newHp: updatedAttacker.combatStats.currentHp,
    };
  }

  // 10. Позначаємо що атакуючий використав дію
  updatedAttacker.actionFlags.hasUsedAction = true;

  // 11. Створюємо BattleAction
  const battleAction: BattleAction = {
    id: `attack-${attacker.basicInfo.id}-${Date.now()}`,
    battleId,
    round: currentRound,
    actionIndex: 0, // буде встановлено в route
    timestamp: new Date(),
    actorId: attacker.basicInfo.id,
    actorName: attacker.basicInfo.name,
    actorSide: attacker.basicInfo.side,
    actionType: "attack",
    targets: [
      {
        participantId: target.basicInfo.id,
        participantName: target.basicInfo.name,
      },
    ],
    actionDetails: {
      weaponName: attack.name,
      attackRoll: d20Roll,
      attackBonus: attackRoll.attackBonus,
      totalAttackValue: attackRoll.totalAttackValue,
      targetAC: updatedTarget.combatStats.armorClass,
      isHit: true,
      isCritical: attackRoll.isCritical,
      isCriticalFail: false,
      damageRolls: damageRolls.map((roll) => ({
        dice: attack.damageDice,
        results: [roll],
        total: roll,
        damageType: attack.damageType,
      })),
      totalDamage: damageCalculation.totalDamage,
      damageBreakdown: damageCalculation.breakdown.join("; "),
    },
    resultText: `${attacker.basicInfo.name} завдав ${totalFinalDamage} урону ${target.basicInfo.name}${attackRoll.isCritical ? " (КРИТИЧНЕ ПОПАДАННЯ!)" : ""}${criticalEffectApplied ? ` - ${criticalEffectApplied.name}` : ""}${reactionTriggered ? ` | ${target.basicInfo.name} виконав контр-удар на ${reactionDamage} урону` : ""}`,
    hpChanges: [
      {
        participantId: target.basicInfo.id,
        participantName: target.basicInfo.name,
        oldHp: oldHp,
        newHp: updatedTarget.combatStats.currentHp,
        change: totalFinalDamage,
      },
      ...(reactionTriggered && reactionAttackerHpChange
        ? [
            {
              participantId: attacker.basicInfo.id,
              participantName: attacker.basicInfo.name,
              oldHp: reactionAttackerHpChange.oldHp,
              newHp: reactionAttackerHpChange.newHp,
              change: reactionDamage,
            },
          ]
        : []),
    ],
    isCancelled: false,
  };

  return {
    success: true,
    attackRoll,
    damage: {
      totalDamage: damageCalculation.totalDamage,
      finalDamage: totalFinalDamage,
      breakdown: damageCalculation.breakdown,
      resistanceBreakdown: resistanceResult.breakdown,
      additionalDamageBreakdown: additionalDamageBreakdown,
    },
    targetUpdated: updatedTarget,
    attackerUpdated: updatedAttacker,
    criticalEffectApplied,
    reactionTriggered,
    reactionDamage,
    battleAction,
  };
}
