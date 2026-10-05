/**
 * Повна обробка заклинання з усіма модифікаторами та ефектами
 */

import { type AttackFlow, fire, getP, put, settleDowned } from "../attack/process/ability-flow";
import { applyMainActionUsed } from "../participant";
import type {
  BattleSpell,
  ProcessSpellParams,
  ProcessSpellResult,
} from "../types/spell-process";
import { calculateSpellAdditionalModifier } from "./calculations";
import { buildSpellSuccessAction } from "./process-actions";
import {
  handleDispelSpell,
  handleNoSpellSlot,
  handleNoTargetSpell,
  handleSpellHitCheckMiss,
} from "./process-branches";
import type { SpellCalculation } from "./process-damage";
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

import { isUp, withSelf } from "@/lib/utils/abilities/engine/participants";
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

  const casterId = caster.basicInfo.id;

  const flow: AttackFlow = { ps: withSelf(allParticipants, caster), messages: [], ctx: { round: currentRound, rng: params.rng ?? Math.random } };

  const { actionModifiers } = fire(flow, { type: "spellCast", phase: "before", actorId: casterId, targetIds });

  let updatedCaster = getP(flow, casterId);

  const targets = flow.ps.filter((p) => targetIds.includes(p.basicInfo.id));

  let updatedTargets = targets.map((t) => ({ ...t }));

  const finish = (result: ProcessSpellResult, opts: { after: boolean }): ProcessSpellResult => {
    put(flow, result.casterUpdated);

    for (const t of result.targetsUpdated) put(flow, t);

    if (opts.after) fire(flow, { type: "spellCast", phase: "after", actorId: casterId, targetIds });

    if (flow.messages.length > 0) {
      result.battleAction.resultText = [result.battleAction.resultText, ...flow.messages].filter(Boolean).join(" | ");
    }

    return {
      ...result,
      casterUpdated: getP(flow, casterId),
      targetsUpdated: result.targetsUpdated.map((t) => getP(flow, t.basicInfo.id)),
      allParticipantsUpdated: flow.ps,
    };
  };

  const spellLevel = spell.level.toString();

  const isUnit = updatedCaster.basicInfo.sourceType === "unit";

  const slotKey = isUnit ? "universal" : spellLevel;

  const spellSlot = updatedCaster.spellcasting.spellSlots[slotKey];

  if (
    !isDMCast &&
    (!spellSlot || spellSlot.current <= 0)
  ) {
    return finish(handleNoSpellSlot(
      updatedCaster,
      spell,
      targetIds,
      flow.ps,
      updatedTargets,
      battleId,
      currentRound,
    ), { after: false });
  }

  if (spell.type === "no_target") {
    return finish(handleNoTargetSpell(
      updatedCaster,
      spell,
      flow.ps,
      slotKey,
      battleId,
      currentRound,
    ), { after: true });
  }

  const isDispel =
    spell.healModifier === "dispel" ||
    spell.name === "Cleansing" ||
    spell.name === "Очищення";

  if (isDispel) {
    return finish(handleDispelSpell(
      updatedCaster,
      spell,
      targetIds,
      flow.ps,
      updatedTargets,
      slotKey,
      battleId,
      currentRound,
    ), { after: true });
  }

  if (spell.hitCheck) {
    const ability = spell.hitCheck.ability.toLowerCase();

    const modifier =
      updatedCaster.abilities.modifiers[
        ability as keyof typeof updatedCaster.abilities.modifiers
      ] ?? 0;

    const totalHit = (hitRoll ?? 0) + modifier;

    if (hitRoll === undefined || totalHit < spell.hitCheck.dc) {
      return finish(handleSpellHitCheckMiss(
        updatedCaster,
        spell,
        targetIds,
        flow.ps,
        updatedTargets,
        slotKey,
        battleId,
        currentRound,
      ), { after: false });
    }
  }

  let spellCalculation: SpellCalculation;

  const spellDiceCount = spell.diceCount ?? 0;

  const appliesDiceDamage =
    (spell.damageType === "damage" || spell.damageType === "all") &&
    spellDiceCount > 0;

  const appliesDiceHeal = spell.damageType === "heal" && spellDiceCount > 0;

  if (appliesDiceDamage) {
    const result = computeSpellDamageAndApply({
      caster: updatedCaster,
      spell,
      damageRolls,
      additionalRollResult,
      savingThrows,
      updatedTargets,
      allParticipants: flow.ps,
      actionModifiers,
    });

    spellCalculation = result.spellCalculation;
    updatedTargets = result.updatedTargets;
  } else if (appliesDiceHeal) {
    const result = computeSpellHealAndApply(
      updatedCaster,
      spell,
      damageRolls,
      additionalRollResult,
      updatedTargets,
      flow.ps,
      actionModifiers,
    );

    spellCalculation = result.spellCalculation;
    updatedTargets = result.updatedTargets;
  } else {
    const noDiceHint =
      spellDiceCount === 0 &&
      (spell.damageType === "damage" ||
        spell.damageType === "heal" ||
        spell.damageType === "all")
        ? " (без кубиків — HP не змінено за дайсами)"
        : "";

    spellCalculation = {
      breakdown: [`${spell.name} застосовано${noDiceHint}`],
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
    caster,
  );
  updatedTargets = applySpellDurationEffects(spell, updatedTargets, currentRound, caster);
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

  put(flow, updatedCaster);

  for (const t of updatedTargets) put(flow, t);

  for (const orig of targets) {
    if (isUp(orig)) settleDowned(flow, orig.basicInfo.id, casterId);
  }

  const battleAction = buildSpellSuccessAction(
    getP(flow, casterId),
    spell,
    targetIds,
    flow.ps,
    updatedTargets.map((t) => getP(flow, t.basicInfo.id)),
    targets,
    spellCalculation,
    additionalModifier,
    savingThrows,
    battleId,
    currentRound,
  );

  return finish(
    {
      success: true,
      spellCalculation,
      targetsUpdated: updatedTargets,
      casterUpdated: getP(flow, casterId),
      battleAction,
    },
    { after: true },
  );
}
