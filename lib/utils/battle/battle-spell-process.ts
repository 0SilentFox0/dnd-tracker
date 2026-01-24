/**
 * Повна обробка заклинання з усіма модифікаторами та ефектами
 */

import { addActiveEffect } from "./battle-effects";
import { applyResistance } from "./battle-resistance";
import {
  calculateSpellAdditionalModifier,
  calculateSpellDamageWithEnhancements,
} from "./battle-spell-calculations";

import { BATTLE_CONSTANTS, ParticipantSide } from "@/lib/constants/battle";
import {
  executeAfterSpellCastTriggers,
  executeBeforeSpellCastTriggers,
} from "@/lib/utils/skills/skill-triggers-execution";
import { BattleAction, BattleParticipant } from "@/types/battle";

/**
 * Інтерфейс заклинання для бою
 */
export interface BattleSpell {
  id: string;
  name: string;
  level: number;
  type: "target" | "aoe";
  target?: "enemies" | "allies" | "all";
  damageType: "damage" | "heal" | "all";
  damageElement?: string | null;
  damageModifier?: string | null;
  healModifier?: string | null;
  diceCount?: number | null;
  diceType?: string | null;
  savingThrow?: {
    ability: string;
    onSuccess: "half" | "none";
  } | null;
  description: string;
}

/**
 * Параметри для обробки заклинання
 */
export interface ProcessSpellParams {
  caster: BattleParticipant;
  spell: BattleSpell;
  targetIds: string[]; // масив ID цілей (для target - одна, для AOE - багато)
  allParticipants: BattleParticipant[];
  currentRound: number;
  battleId: string;
  damageRolls: number[]; // результати кубиків урону/лікування
  savingThrows?: Array<{
    participantId: string;
    roll: number; // результат d20
  }>; // результати saving throws для кожної цілі
  additionalRollResult?: number; // результат додаткових кубиків (для spellAdditionalModifier)
}

/**
 * Результат обробки заклинання
 */
export interface ProcessSpellResult {
  success: boolean;
  spellCalculation?: {
    totalDamage?: number;
    totalHealing?: number;
    breakdown: string[];
    resistanceBreakdown: string[];
  };
  targetsUpdated: BattleParticipant[];
  casterUpdated: BattleParticipant;
  battleAction: BattleAction;
}

/**
 * Повна обробка заклинання
 */
export function processSpell(params: ProcessSpellParams): ProcessSpellResult {
  const {
    caster,
    spell,
    targetIds,
    allParticipants,
    currentRound,
    battleId,
    damageRolls,
    savingThrows = [],
    additionalRollResult,
  } = params;

  let updatedCaster = { ...caster };

  const targets = allParticipants.filter((p) =>
    targetIds.includes(p.basicInfo.id),
  );

  const updatedTargets = targets.map((t) => ({ ...t }));

  // Визначаємо чи це дія власника (для тригерів)
  const isOwnerAction = caster.basicInfo.side === ParticipantSide.ALLY;

  // 0. Виконуємо тригери перед кастом заклинання
  const firstTarget = targets[0];

  const beforeSpellResult = executeBeforeSpellCastTriggers(
    updatedCaster,
    firstTarget,
    allParticipants,
    isOwnerAction,
  );

  updatedCaster = beforeSpellResult.updatedCaster;

  // 1. Перевіряємо чи є spell slot
  const spellLevel = spell.level.toString();

  const spellSlot = updatedCaster.spellcasting.spellSlots[spellLevel];

  if (!spellSlot || spellSlot.current <= 0) {
    const battleAction: BattleAction = {
      id: `spell-${caster.basicInfo.id}-${Date.now()}`,
      battleId,
      round: currentRound,
      actionIndex: 0,
      timestamp: new Date(),
      actorId: caster.basicInfo.id,
      actorName: caster.basicInfo.name,
      actorSide: caster.basicInfo.side,
      actionType: "spell",
      targets: targetIds.map((id) => {
        const target = allParticipants.find((p) => p.basicInfo.id === id);

        return {
          participantId: id,
          participantName: target?.basicInfo.name || "Unknown",
        };
      }),
      actionDetails: {
        spellId: spell.id,
        spellName: spell.name,
        spellLevel: spell.level,
      },
      resultText: `${caster.basicInfo.name} намагався використати ${spell.name}, але немає доступних spell slots`,
      hpChanges: [],
      isCancelled: false,
    };

    return {
      success: false,
      casterUpdated: updatedCaster,
      targetsUpdated: updatedTargets,
      battleAction,
    };
  }

  // 2. Розраховуємо базовий урон/лікування
  const baseValue = damageRolls.reduce((sum, roll) => sum + roll, 0);

  // 3. Розраховуємо урон/лікування з покращеннями
  let spellCalculation: {
    totalDamage?: number;
    totalHealing?: number;
    breakdown: string[];
    resistanceBreakdown: string[];
  };

  if (spell.damageType === "damage" || spell.damageType === "all") {
    // Розрахунок урону
    const damageCalc = calculateSpellDamageWithEnhancements(
      updatedCaster,
      baseValue,
      additionalRollResult,
    );

    // Застосовуємо опір/імунітет для кожної цілі
    const allResistanceBreakdown: string[] = [];

    const targetDamages: Array<{
      target: BattleParticipant;
      finalDamage: number;
    }> = [];

    for (let i = 0; i < updatedTargets.length; i++) {
      const target = updatedTargets[i];

      const savingThrow = savingThrows.find(
        (st) => st.participantId === target.basicInfo.id,
      );

      // Розраховуємо урон з урахуванням saving throw
      let damageToApply = damageCalc.totalDamage;

      if (spell.savingThrow && savingThrow) {
        // Розраховуємо totalSave
        const ability = spell.savingThrow.ability.toLowerCase();

        const statModifier =
          updatedCaster.abilities.modifiers[
            ability as keyof typeof updatedCaster.abilities.modifiers
          ] || 0;

        const totalSave = savingThrow.roll + statModifier;

        // Перевіряємо чи успішний save
        const spellSaveDC = updatedCaster.spellcasting.spellSaveDC || 10;

        if (totalSave >= spellSaveDC) {
          // Успішний save
          if (spell.savingThrow.onSuccess === "half") {
            damageToApply = Math.floor(damageToApply / 2);
          } else {
            damageToApply = 0;
          }
        }
      }

      // Застосовуємо опір/імунітет
      const damageType = spell.damageElement || "magic";

      const resistanceResult = applyResistance(
        target,
        damageToApply,
        damageType,
      );

      targetDamages.push({ target, finalDamage: resistanceResult.finalDamage });
      allResistanceBreakdown.push(...resistanceResult.breakdown);
    }

    spellCalculation = {
      totalDamage: damageCalc.totalDamage,
      breakdown: damageCalc.breakdown,
      resistanceBreakdown: allResistanceBreakdown,
    };

    // Застосовуємо урон до цілей
    for (const { target, finalDamage } of targetDamages) {
      const targetIndex = updatedTargets.findIndex(
        (t) => t.basicInfo.id === target.basicInfo.id,
      );

      if (targetIndex === -1) continue;

      let remainingDamage = finalDamage;

      // Спочатку віднімаємо з tempHp
      if (
        updatedTargets[targetIndex].combatStats.tempHp > 0 &&
        remainingDamage > 0
      ) {
        const tempDamage = Math.min(
          updatedTargets[targetIndex].combatStats.tempHp,
          remainingDamage,
        );

        updatedTargets[targetIndex].combatStats.tempHp -= tempDamage;
        remainingDamage -= tempDamage;
      }

      // Потім віднімаємо з currentHp
      updatedTargets[targetIndex].combatStats.currentHp = Math.max(
        BATTLE_CONSTANTS.MIN_DAMAGE,
        updatedTargets[targetIndex].combatStats.currentHp - remainingDamage,
      );

      // Оновлюємо статус
      if (updatedTargets[targetIndex].combatStats.currentHp <= 0) {
        updatedTargets[targetIndex].combatStats.status =
          updatedTargets[targetIndex].combatStats.currentHp < 0
            ? "dead"
            : "unconscious";
      }
    }
  } else if (spell.damageType === "heal") {
    // Розрахунок лікування
    const healingCalc = calculateSpellDamageWithEnhancements(
      updatedCaster,
      baseValue,
      additionalRollResult,
    );

    spellCalculation = {
      totalHealing: healingCalc.totalDamage, // для лікування використовуємо totalDamage як totalHealing
      breakdown: healingCalc.breakdown,
      resistanceBreakdown: [],
    };

    // Застосовуємо лікування до цілей
    for (const target of updatedTargets) {
      const targetIndex = updatedTargets.findIndex(
        (t) => t.basicInfo.id === target.basicInfo.id,
      );

      if (targetIndex === -1) continue;

      const healing = spellCalculation.totalHealing || 0;

      updatedTargets[targetIndex].combatStats.currentHp = Math.min(
        updatedTargets[targetIndex].combatStats.maxHp,
        updatedTargets[targetIndex].combatStats.currentHp + healing,
      );

      // Якщо був unconscious, піднімаємо
      if (
        updatedTargets[targetIndex].combatStats.status === "unconscious" &&
        updatedTargets[targetIndex].combatStats.currentHp > 0
      ) {
        updatedTargets[targetIndex].combatStats.status = "active";
      }
    }
  } else {
    // Контроль/статус ефекти (без урону/лікування)
    spellCalculation = {
      breakdown: [`${spell.name} застосовано`],
      resistanceBreakdown: [],
    };
  }

  // 4. Застосовуємо додаткові модифікатори (burning, poison, тощо)
  const additionalModifier = calculateSpellAdditionalModifier(
    updatedCaster,
    additionalRollResult,
  );

  if (additionalModifier.modifier && additionalModifier.duration) {
    // Додаємо DOT ефект до цілей
    for (const target of updatedTargets) {
      const targetIndex = updatedTargets.findIndex(
        (t) => t.basicInfo.id === target.basicInfo.id,
      );

      if (targetIndex === -1) continue;

      const modifierType = additionalModifier.modifier || "poison";

      const dotDamage = additionalModifier.damage || 0;

      if (dotDamage > 0 && additionalModifier.duration > 0) {
        const updatedEffects = addActiveEffect(
          updatedTargets[targetIndex],
          {
            id: `spell-modifier-${spell.id}-${target.basicInfo.id}-${Date.now()}`,
            name: `${spell.name} - ${modifierType}`,
            type: "debuff",
            description: spell.description,
            duration: additionalModifier.duration,
            effects: [
              {
                type: `${modifierType}_damage`,
                value: dotDamage,
                damageType: modifierType,
              },
            ],
            dotDamage: {
              damagePerRound: dotDamage,
              damageType: modifierType,
            },
          },
          currentRound,
        );

        updatedTargets[targetIndex] = {
          ...updatedTargets[targetIndex],
          battleData: {
            ...updatedTargets[targetIndex].battleData,
            activeEffects: updatedEffects,
          },
        };
      }
    }
  }

  // 5. Витрачаємо spell slot
  updatedCaster.spellcasting.spellSlots[spellLevel] = {
    ...updatedCaster.spellcasting.spellSlots[spellLevel],
    current: updatedCaster.spellcasting.spellSlots[spellLevel].current - 1,
  };

  // 6. Позначаємо що кастер використав дію
  updatedCaster.actionFlags.hasUsedAction = true;

  // 7. Створюємо BattleAction
  const hpChanges = updatedTargets
    .map((target, index) => {
      const originalTarget = targets[index];

      if (!originalTarget) return null;

      const change =
        spell.damageType === "heal"
          ? spellCalculation.totalHealing || 0
          : target.combatStats.currentHp - originalTarget.combatStats.currentHp;

      return {
        participantId: target.basicInfo.id,
        participantName: target.basicInfo.name,
        oldHp: originalTarget.combatStats.currentHp,
        newHp: target.combatStats.currentHp,
        change: -change, // негативне для лікування, позитивне для урону
      };
    })
    .filter((change): change is NonNullable<typeof change> => change !== null);

  const savingThrowsDetails = savingThrows.map((st) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _target = allParticipants.find(
      (p) => p.basicInfo.id === st.participantId,
    );

    const ability = spell.savingThrow?.ability || "unknown";

    const statModifier =
      updatedCaster.abilities.modifiers[
        ability.toLowerCase() as keyof typeof updatedCaster.abilities.modifiers
      ] || 0;

    const totalSave = st.roll + statModifier;

    const spellSaveDC = updatedCaster.spellcasting.spellSaveDC || 10;

    const result = totalSave >= spellSaveDC ? "success" : "fail";

    return {
      participantId: st.participantId,
      ability,
      roll: st.roll,
      result,
    };
  });

  const battleAction: BattleAction = {
    id: `spell-${caster.basicInfo.id}-${Date.now()}`,
    battleId,
    round: currentRound,
    actionIndex: 0,
    timestamp: new Date(),
    actorId: caster.basicInfo.id,
    actorName: caster.basicInfo.name,
    actorSide: caster.basicInfo.side,
    actionType: "spell",
    targets: targetIds.map((id) => {
      const target = allParticipants.find((p) => p.basicInfo.id === id);

      return {
        participantId: id,
        participantName: target?.basicInfo.name || "Unknown",
      };
    }),
    actionDetails: {
      spellId: spell.id,
      spellName: spell.name,
      spellLevel: spell.level,
      spellSlotUsed: spell.level,
      totalDamage: spellCalculation.totalDamage,
      totalHealing: spellCalculation.totalHealing,
      damageBreakdown: spellCalculation.breakdown.join("; "),
      savingThrows:
        savingThrowsDetails.length > 0
          ? savingThrowsDetails.map((st) => ({
              participantId: st.participantId,
              ability: st.ability,
              roll: st.roll,
              result: st.result as "success" | "fail",
            }))
          : undefined,
      appliedEffects:
        additionalModifier.modifier && additionalModifier.duration
          ? updatedTargets.map((t) => ({
              id: `spell-modifier-${spell.id}-${t.basicInfo.id}`,
              name: `${spell.name} - ${additionalModifier.modifier}`,
              duration: additionalModifier.duration ?? 0,
            }))
          : undefined,
    },
    resultText: `${caster.basicInfo.name} використав ${spell.name}${spell.damageType === "damage" ? ` завдавши ${spellCalculation.totalDamage || 0} урону` : spell.damageType === "heal" ? ` вилікувавши ${spellCalculation.totalHealing || 0} HP` : ""}`,
    hpChanges,
    isCancelled: false,
  };

  // Виконуємо тригери після касту заклинання
  const afterSpellResult = executeAfterSpellCastTriggers(
    updatedCaster,
    firstTarget,
    allParticipants,
    isOwnerAction,
  );

  updatedCaster = afterSpellResult.updatedCaster;

  return {
    success: true,
    spellCalculation,
    targetsUpdated: updatedTargets,
    casterUpdated: updatedCaster,
    battleAction,
  };
}
