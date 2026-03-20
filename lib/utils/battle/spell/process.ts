/**
 * Повна обробка заклинання з усіма модифікаторами та ефектами
 */

import { applyMainActionUsed } from "../participant";
import type {
  BattleSpell,
  ProcessSpellParams,
  ProcessSpellResult,
} from "../types/spell-process";
import { calculateSpellAdditionalModifier } from "./calculations";
import { buildSpellSuccessAction, type SpellCalculation } from "./process-actions";
import {
  handleDispelSpell,
  handleNoSpellSlot,
  handleNoTargetSpell,
  handleSpellHitCheckMiss,
} from "./process-branches";
import {
  computeSpellDamageAndApply,
  computeSpellHealAndApply,
} from "./process-damage";
import {
  applySpellAdditionalModifier,
  applySpellDurationEffects,
  applySpellManaSteal,
  applySpellRemoveBuffsDebuffs,
} from "./process-effects";
import { generateSpellDamageRolls } from "./process-helpers";

import { ParticipantSide } from "@/lib/constants/battle";
import {
  executeAfterSpellCastTriggers,
  executeBeforeSpellCastTriggers,
  executeOnKillEffects,
} from "@/lib/utils/skills/execution";
export type { BattleSpell, ProcessSpellParams, ProcessSpellResult };

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
    damageRolls: rawDamageRolls,
    savingThrows = [],
    additionalRollResult,
    hitRoll,
    isDMCast = false,
  } = params;

  const needsRolls =
    (spell.damageType === "damage" || spell.damageType === "heal" || spell.damageType === "all") &&
    (spell.diceCount ?? 0) > 0;

  const expectedCount = spell.diceCount ?? 0;

  const validRolls = rawDamageRolls.filter((r) => Number.isFinite(r) && r > 0);

  const damageRolls =
    needsRolls && validRolls.length < expectedCount
      ? [
          ...validRolls,
          ...generateSpellDamageRolls(
            Math.max(0, expectedCount - validRolls.length),
            spell.diceType,
          ),
        ].slice(0, expectedCount)
      : validRolls.length > 0
        ? validRolls
        : rawDamageRolls.filter((r) => Number.isFinite(r));

  let updatedCaster = { ...caster };

  const targets = allParticipants.filter((p) => targetIds.includes(p.basicInfo.id));

  let updatedTargets = targets.map((t) => ({ ...t }));

  const isOwnerAction = caster.basicInfo.side === ParticipantSide.ALLY;

  const firstTarget = targets[0];

  const beforeSpellResult = executeBeforeSpellCastTriggers(
    updatedCaster,
    firstTarget,
    allParticipants,
    isOwnerAction,
  );

  updatedCaster = beforeSpellResult.updatedCaster;

  const spellLevel = spell.level.toString();

  const isUnit = updatedCaster.basicInfo.sourceType === "unit";

  const slotKey = isUnit ? "universal" : spellLevel;

  const spellSlot = updatedCaster.spellcasting.spellSlots[slotKey];

  if (
    !isDMCast &&
    (!spellSlot || spellSlot.current <= 0)
  ) {
    return handleNoSpellSlot(
      updatedCaster,
      spell,
      targetIds,
      allParticipants,
      updatedTargets,
      battleId,
      currentRound,
    );
  }

  if (spell.type === "no_target") {
    return handleNoTargetSpell(
      updatedCaster,
      spell,
      allParticipants,
      slotKey,
      battleId,
      currentRound,
      isOwnerAction,
    );
  }

  const isDispel =
    spell.healModifier === "dispel" ||
    spell.name === "Cleansing" ||
    spell.name === "Очищення";

  if (isDispel) {
    return handleDispelSpell(
      updatedCaster,
      spell,
      targetIds,
      allParticipants,
      updatedTargets,
      slotKey,
      battleId,
      currentRound,
      isOwnerAction,
      firstTarget,
    );
  }

  if (spell.hitCheck) {
    const ability = spell.hitCheck.ability.toLowerCase();

    const modifier =
      updatedCaster.abilities.modifiers[
        ability as keyof typeof updatedCaster.abilities.modifiers
      ] ?? 0;

    const totalHit = (hitRoll ?? 0) + modifier;

    if (hitRoll === undefined || totalHit < spell.hitCheck.dc) {
      return handleSpellHitCheckMiss(
        updatedCaster,
        spell,
        targetIds,
        allParticipants,
        updatedTargets,
        slotKey,
        battleId,
        currentRound,
      );
    }
  }

  let spellCalculation: SpellCalculation;

  if (spell.damageType === "damage" || spell.damageType === "all") {
    const result = computeSpellDamageAndApply({
      caster: updatedCaster,
      spell,
      damageRolls,
      additionalRollResult,
      savingThrows,
      updatedTargets,
    });

    spellCalculation = result.spellCalculation;
    updatedTargets = result.updatedTargets;
  } else if (spell.damageType === "heal") {
    const result = computeSpellHealAndApply(
      updatedCaster,
      spell,
      damageRolls,
      additionalRollResult,
      updatedTargets,
    );

    spellCalculation = result.spellCalculation;
    updatedTargets = result.updatedTargets;
  } else {
    spellCalculation = {
      breakdown: [`${spell.name} застосовано`],
      resistanceBreakdown: [],
    };
  }

  const fromCaster = calculateSpellAdditionalModifier(
    updatedCaster,
    additionalRollResult,
  );

  const fromSpell = spell.effectDetails?.additionalModifier;

  const additionalModifier =
    fromSpell &&
    typeof fromSpell.duration === "number" &&
    fromSpell.duration > 0 &&
    (typeof fromSpell.damage === "number" || fromCaster.damage > 0)
      ? {
          modifier: fromSpell.modifier ?? fromCaster.modifier ?? "poison",
          duration: fromSpell.duration,
          damage:
            typeof fromSpell.damage === "number"
              ? fromSpell.damage
              : fromCaster.damage ?? 0,
        }
      : fromCaster;

  updatedTargets = applySpellAdditionalModifier(
    spell,
    updatedTargets,
    additionalModifier,
    currentRound,
  );
  updatedTargets = applySpellDurationEffects(spell, updatedTargets, currentRound);
  updatedTargets = applySpellRemoveBuffsDebuffs(spell, updatedTargets);
  updatedTargets = applySpellManaSteal(spell, updatedTargets);

  if (!isDMCast && updatedCaster.spellcasting.spellSlots[slotKey]) {
    updatedCaster = {
      ...updatedCaster,
      spellcasting: {
        ...updatedCaster.spellcasting,
        spellSlots: {
          ...updatedCaster.spellcasting.spellSlots,
          [slotKey]: {
            ...updatedCaster.spellcasting.spellSlots[slotKey],
            current: updatedCaster.spellcasting.spellSlots[slotKey].current - 1,
          },
        },
      },
    };
  }

  const isBonusAction = spell.castingTime?.toLowerCase().includes("bonus") ?? false;

  if (isBonusAction) {
    updatedCaster.actionFlags = { ...updatedCaster.actionFlags, hasUsedBonusAction: true };
  } else {
    updatedCaster = applyMainActionUsed(updatedCaster);
  }

  if (spell.damageType === "damage" || spell.damageType === "all") {
    const casterSkillUsageCounts: Record<string, number> = {
      ...(updatedCaster.battleData.skillUsageCounts ?? {}),
    };

    let killedCount = 0;

    for (let i = 0; i < updatedTargets.length; i++) {
      const orig = targets[i];

      const after = updatedTargets[i];

      if (
        orig &&
        after &&
        orig.basicInfo.side !== updatedCaster.basicInfo.side &&
        orig.combatStats.currentHp > 0 &&
        after.combatStats.currentHp <= 0
      ) {
        killedCount += 1;
      }
    }
    for (let k = 0; k < killedCount; k++) {
      const onKillResult = executeOnKillEffects(updatedCaster, casterSkillUsageCounts);

      updatedCaster = onKillResult.updatedKiller;
    }
    updatedCaster = {
      ...updatedCaster,
      battleData: {
        ...updatedCaster.battleData,
        skillUsageCounts: casterSkillUsageCounts,
      },
    };
  }

  const battleAction = buildSpellSuccessAction(
    updatedCaster,
    spell,
    targetIds,
    allParticipants,
    updatedTargets,
    targets,
    spellCalculation,
    additionalModifier,
    savingThrows,
    battleId,
    currentRound,
  );

  const afterSpellResult = executeAfterSpellCastTriggers(
    updatedCaster,
    firstTarget,
    allParticipants,
    isOwnerAction,
  );

  return {
    success: true,
    spellCalculation,
    targetsUpdated: updatedTargets,
    casterUpdated: afterSpellResult.updatedCaster,
    battleAction,
  };
}
