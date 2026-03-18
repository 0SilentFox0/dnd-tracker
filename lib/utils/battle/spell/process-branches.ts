/**
 * Обробка гілок заклинання: немає слота, no_target, dispel, промах по hit check
 */

import { applyMainActionUsed } from "../participant";
import type { BattleSpell,ProcessSpellResult } from "../types/spell-process";
import {
  buildDispelSpellAction,
  buildNoSpellSlotAction,
  buildNoTargetSpellAction,
  buildSpellMissAction,
} from "./process-actions";

import { executeAfterSpellCastTriggers } from "@/lib/utils/skills/execution";
import type { BattleParticipant } from "@/types/battle";

export function handleNoSpellSlot(
  caster: BattleParticipant,
  spell: BattleSpell,
  targetIds: string[],
  allParticipants: BattleParticipant[],
  updatedTargets: BattleParticipant[],
  battleId: string,
  currentRound: number,
): ProcessSpellResult {
  const battleAction = buildNoSpellSlotAction(
    caster,
    spell,
    targetIds,
    allParticipants,
    battleId,
    currentRound,
  );

  return {
    success: false,
    casterUpdated: caster,
    targetsUpdated: updatedTargets,
    battleAction,
  };
}

export function handleNoTargetSpell(
  caster: BattleParticipant,
  spell: BattleSpell,
  allParticipants: BattleParticipant[],
  slotKey: string,
  battleId: string,
  currentRound: number,
  isOwnerAction: boolean,
): ProcessSpellResult {
  let updatedCaster = {
    ...caster,
    spellcasting: {
      ...caster.spellcasting,
      spellSlots: {
        ...caster.spellcasting.spellSlots,
        [slotKey]: {
          ...caster.spellcasting.spellSlots[slotKey],
          current: caster.spellcasting.spellSlots[slotKey].current - 1,
        },
      },
    },
  };

  const isBonusAction = spell.castingTime?.toLowerCase().includes("bonus") ?? false;

  if (isBonusAction) {
    updatedCaster.actionFlags = { ...updatedCaster.actionFlags, hasUsedBonusAction: true };
  } else {
    updatedCaster = applyMainActionUsed(updatedCaster);
  }

  const noTargetAction = buildNoTargetSpellAction(
    caster,
    spell,
    battleId,
    currentRound,
  );

  const afterNoTarget = executeAfterSpellCastTriggers(
    updatedCaster,
    undefined,
    allParticipants,
    isOwnerAction,
  );

  return {
    success: true,
    targetsUpdated: [],
    casterUpdated: afterNoTarget.updatedCaster,
    battleAction: noTargetAction,
  };
}

export function handleDispelSpell(
  caster: BattleParticipant,
  spell: BattleSpell,
  targetIds: string[],
  allParticipants: BattleParticipant[],
  updatedTargets: BattleParticipant[],
  slotKey: string,
  battleId: string,
  currentRound: number,
  isOwnerAction: boolean,
  firstTarget: BattleParticipant | undefined,
): ProcessSpellResult {
  const targetsWithDispel = updatedTargets.map((t) => ({
    ...t,
    battleData: {
      ...t.battleData,
      activeEffects: t.battleData.activeEffects.filter((e) => e.type === "buff"),
    },
  }));

  let updatedCaster = {
    ...caster,
    spellcasting: {
      ...caster.spellcasting,
      spellSlots: {
        ...caster.spellcasting.spellSlots,
        [slotKey]: {
          ...caster.spellcasting.spellSlots[slotKey],
          current: caster.spellcasting.spellSlots[slotKey].current - 1,
        },
      },
    },
  };

  const isBonusAction = spell.castingTime?.toLowerCase().includes("bonus") ?? false;

  if (isBonusAction) {
    updatedCaster.actionFlags = { ...updatedCaster.actionFlags, hasUsedBonusAction: true };
  } else {
    updatedCaster = applyMainActionUsed(updatedCaster);
  }

  const targetNames = targetsWithDispel.map((t) => t.basicInfo.name).join(", ");

  const dispelAction = buildDispelSpellAction(
    caster,
    spell,
    targetIds,
    allParticipants,
    targetNames,
    battleId,
    currentRound,
  );

  const afterDispel = executeAfterSpellCastTriggers(
    updatedCaster,
    firstTarget,
    allParticipants,
    isOwnerAction,
  );

  return {
    success: true,
    targetsUpdated: targetsWithDispel,
    casterUpdated: afterDispel.updatedCaster,
    battleAction: dispelAction,
  };
}

export function handleSpellHitCheckMiss(
  caster: BattleParticipant,
  spell: BattleSpell,
  targetIds: string[],
  allParticipants: BattleParticipant[],
  updatedTargets: BattleParticipant[],
  slotKey: string,
  battleId: string,
  currentRound: number,
): ProcessSpellResult {
  let updatedCaster = {
    ...caster,
    spellcasting: {
      ...caster.spellcasting,
      spellSlots: {
        ...caster.spellcasting.spellSlots,
        [slotKey]: {
          ...caster.spellcasting.spellSlots[slotKey],
          current: caster.spellcasting.spellSlots[slotKey].current - 1,
        },
      },
    },
  };

  const isBonusAction = spell.castingTime?.toLowerCase().includes("bonus") ?? false;

  if (isBonusAction) {
    updatedCaster.actionFlags = { ...updatedCaster.actionFlags, hasUsedBonusAction: true };
  } else {
    updatedCaster = applyMainActionUsed(updatedCaster);
  }

  const missAction = buildSpellMissAction(
    caster,
    spell,
    targetIds,
    allParticipants,
    battleId,
    currentRound,
  );

  return {
    success: true,
    targetsUpdated: updatedTargets,
    casterUpdated: updatedCaster,
    battleAction: missAction,
  };
}
