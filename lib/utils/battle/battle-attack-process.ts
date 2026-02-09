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
  getHeroDamageDiceForLevel,
} from "@/lib/constants/hero-scaling";
import { getDiceAverage } from "@/lib/utils/battle/balance-calculations";
import { getEffectiveArmorClass } from "@/lib/utils/battle/battle-participant-helpers";
import {
  checkSurviveLethal,
  executeAfterAttackTriggers,
  executeBeforeAttackTriggers,
  executeOnHitEffects,
  executeOnKillEffects,
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

  // 2. Перевіряємо попадання (з урахуванням ефективного AC цілі, включно з дебафами −2 AC)
  // Критичний промах (Natural 1) = автоматичний промах
  // Критичне попадання (Natural 20) = автоматичне попадання
  const targetAC = getEffectiveArmorClass(updatedTarget);
  const isHit =
    !attackRoll.isCriticalFail &&
    (attackRoll.isCritical || attackRoll.totalAttackValue >= targetAC);

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
        targetAC,
        isHit: false,
        isCritical: false,
        isCriticalFail: true,
        criticalEffect: criticalEffectApplied
          ? {
              id: criticalEffectApplied.id,
              name: criticalEffectApplied.name,
              description: criticalEffectApplied.description,
              type: criticalEffectApplied.type,
            }
          : undefined,
      },
      resultText: `${attacker.basicInfo.name} критично промахнувся! [d10: ${criticalEffectApplied.id}] ${criticalEffectApplied.name}: ${criticalEffectApplied.description}`,
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
        targetAC,
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
  let baseDamage = damageRolls.reduce((sum, roll) => sum + roll, 0);

  const statModifier =
    attack.type === AttackType.MELEE
      ? Math.floor((updatedAttacker.abilities.strength - 10) / 2)
      : Math.floor((updatedAttacker.abilities.dexterity - 10) / 2);

  // Герой: рівень + кубики за рівнем (d6/d8)
  const isHero = updatedAttacker.basicInfo.sourceType === "character";
  const heroLevelPart = isHero ? updatedAttacker.abilities.level : 0;
  const heroDiceNotation = isHero
    ? getHeroDamageDiceForLevel(updatedAttacker.abilities.level, attack.type as AttackType)
    : "";
  const heroDicePart = heroDiceNotation ? getDiceAverage(heroDiceNotation) : 0;

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
      heroLevelPart,
      heroDicePart,
      heroDiceNotation,
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
  }

  // 4b. Модифікатори урону від критичного ефекту (Natural 20)
  let physicalDamage = damageCalculation.totalDamage;
  if (criticalEffectApplied?.effect.type === "double_damage") {
    physicalDamage *= 2;
  }
  if (criticalEffectApplied?.effect.type === "max_damage") {
    const diceMatch = attack.damageDice.match(/(\d+)d(\d+)([+-]\d+)?/);
    const count = diceMatch ? parseInt(diceMatch[1], 10) : 1;
    const size = diceMatch ? parseInt(diceMatch[2], 10) : 6;
    const diceMod = diceMatch?.[3] ? parseInt(diceMatch[3], 10) : 0;
    physicalDamage = count * size + diceMod + statModifier;
  }
  if (criticalEffectApplied?.effect.type === "additional_damage") {
    const extraD6 = Math.floor(Math.random() * 6) + 1;
    physicalDamage += extraD6;
  }

  // 5. Застосовуємо опір/імунітет цілі для фізичного урону
  const resistanceResult = applyResistance(
    updatedTarget,
    physicalDamage,
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

  // Мутовані лічильники скілів (oncePerBattle / twicePerBattle)
  const attackerSkillUsageCounts: Record<string, number> = {
    ...(updatedAttacker.battleData.skillUsageCounts ?? {}),
  };
  const targetSkillUsageCounts: Record<string, number> = {
    ...(updatedTarget.battleData.skillUsageCounts ?? {}),
  };

  // 7b. SurviveLethal (onLethalDamage): якщо ціль мала б померти — залишити 1 HP
  if (updatedTarget.combatStats.currentHp <= 0) {
    const surviveResult = checkSurviveLethal(
      updatedTarget,
      targetSkillUsageCounts,
    );
    if (surviveResult.survived) {
      updatedTarget = {
        ...updatedTarget,
        combatStats: {
          ...updatedTarget.combatStats,
          currentHp: 1,
          status: "active",
        },
      };
    }
  }

  // Оновлюємо статус цілі (dead/unconscious), якщо не вижила
  if (updatedTarget.combatStats.currentHp <= 0) {
    updatedTarget = {
      ...updatedTarget,
      combatStats: {
        ...updatedTarget.combatStats,
        status:
          updatedTarget.combatStats.currentHp < 0 ? "dead" : "unconscious",
      },
    };
  }

  // 7c. OnKill: якщо ціль мертва — ефекти атакуючого (наприклад +1 дія)
  const targetIsDead =
    updatedTarget.combatStats.status === "dead" ||
    updatedTarget.combatStats.status === "unconscious";
  if (targetIsDead) {
    const onKillResult = executeOnKillEffects(
      updatedAttacker,
      attackerSkillUsageCounts,
    );
    updatedAttacker = onKillResult.updatedKiller;
  }

  // 7d. OnHit: при попаданні — ефекти атакуючого на ціль (DOT, дебафи) або на себе (руни, лікування)
  if (isHit) {
    const physicalDamageDealt = resistanceResult.finalDamage;
    const onHitResult = executeOnHitEffects(
      updatedAttacker,
      updatedTarget,
      currentRound,
      attackerSkillUsageCounts,
      physicalDamageDealt,
    );
    updatedTarget = onHitResult.updatedTarget;
    updatedAttacker = onHitResult.updatedAttacker;
  }

  // Зливаємо оновлені skillUsageCounts назад у учасників
  updatedAttacker = {
    ...updatedAttacker,
    battleData: {
      ...updatedAttacker.battleData,
      skillUsageCounts: attackerSkillUsageCounts,
    },
  };
  updatedTarget = {
    ...updatedTarget,
    battleData: {
      ...updatedTarget.battleData,
      skillUsageCounts: targetSkillUsageCounts,
    },
  };

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

  // 10. Перевіряємо контр-удар (Reaction); не виконуємо, якщо критичний ефект "ігнорує реакції"
  let reactionTriggered = false;

  let reactionDamage = 0;

  let reactionAttackerHpChange: {
    oldHp: number;
    newHp: number;
  } | null = null;

  const ignoreReactions =
    criticalEffectApplied?.effect.type === "ignore_reactions";

  if (!ignoreReactions && canPerformReaction(updatedTarget)) {
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
      targetAC,
      isHit: true,
      isCritical: attackRoll.isCritical,
      isCriticalFail: false,
      criticalEffect: criticalEffectApplied
        ? {
            id: criticalEffectApplied.id,
            name: criticalEffectApplied.name,
            description: criticalEffectApplied.description,
            type: criticalEffectApplied.type,
          }
        : undefined,
      damageRolls: damageRolls.map((roll) => ({
        dice: attack.damageDice,
        results: [roll],
        total: roll,
        damageType: attack.damageType,
      })),
      totalDamage: physicalDamage,
      damageBreakdown: damageCalculation.breakdown.join("; "),
    },
    resultText: `${attacker.basicInfo.name} завдав ${totalFinalDamage} урону ${target.basicInfo.name}${attackRoll.isCritical ? " (КРИТИЧНЕ ПОПАДАННЯ!)" : ""}${criticalEffectApplied ? ` [d10: ${criticalEffectApplied.id}] ${criticalEffectApplied.name}` : ""}${reactionTriggered ? ` | ${target.basicInfo.name} виконав контр-удар на ${reactionDamage} урону` : ""}`,
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
