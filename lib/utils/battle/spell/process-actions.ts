/**
 * Побудова BattleAction для різних результатів заклинання
 */

import type { BattleSpell } from "../types/spell-process";

import type { BattleAction, BattleParticipant } from "@/types/battle";

export function buildNoSpellSlotAction(
  caster: BattleParticipant,
  spell: BattleSpell,
  targetIds: string[],
  allParticipants: BattleParticipant[],
  battleId: string,
  currentRound: number,
): BattleAction {
  return {
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
}

export function buildNoTargetSpellAction(
  caster: BattleParticipant,
  spell: BattleSpell,
  battleId: string,
  currentRound: number,
): BattleAction {
  return {
    id: `spell-${caster.basicInfo.id}-${Date.now()}`,
    battleId,
    round: currentRound,
    actionIndex: 0,
    timestamp: new Date(),
    actorId: caster.basicInfo.id,
    actorName: caster.basicInfo.name,
    actorSide: caster.basicInfo.side,
    actionType: "spell",
    targets: [],
    actionDetails: {
      spellId: spell.id,
      spellName: spell.name,
      spellLevel: spell.level,
    },
    resultText: `${caster.basicInfo.name} використав ${spell.name} (без цілі)`,
    hpChanges: [],
    isCancelled: false,
  };
}

export function buildDispelSpellAction(
  caster: BattleParticipant,
  spell: BattleSpell,
  targetIds: string[],
  allParticipants: BattleParticipant[],
  targetNames: string,
  battleId: string,
  currentRound: number,
): BattleAction {
  return {
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
    resultText: `${caster.basicInfo.name} використав ${spell.name} і розвіяв ефекти на ${targetNames}`,
    hpChanges: [],
    isCancelled: false,
  };
}

export function buildSpellMissAction(
  caster: BattleParticipant,
  spell: BattleSpell,
  targetIds: string[],
  allParticipants: BattleParticipant[],
  battleId: string,
  currentRound: number,
): BattleAction {
  return {
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
      hitCheckMiss: true,
    },
    resultText: `${caster.basicInfo.name} використав ${spell.name}, але не влучив (перевірка попадання)`,
    hpChanges: [],
    isCancelled: false,
  };
}

export interface SpellCalculation {
  totalDamage?: number;
  totalHealing?: number;
  breakdown: string[];
  resistanceBreakdown: string[];
}

export function buildSpellSuccessAction(
  caster: BattleParticipant,
  spell: BattleSpell,
  targetIds: string[],
  allParticipants: BattleParticipant[],
  updatedTargets: BattleParticipant[],
  originalTargets: BattleParticipant[],
  spellCalculation: SpellCalculation,
  additionalModifier: { modifier?: string; duration?: number },
  savingThrows: Array<{ participantId: string; roll: number }>,
  battleId: string,
  currentRound: number,
): BattleAction {
  const hpChanges = updatedTargets
    .map((target, index) => {
      const originalTarget = originalTargets[index];

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
        change: -change,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const savingThrowsDetails = savingThrows.map((st) => {
    const ability = spell.savingThrow?.ability || "unknown";

    const statModifier =
      caster.abilities.modifiers[
        ability.toLowerCase() as keyof typeof caster.abilities.modifiers
      ] || 0;

    const totalSave = st.roll + statModifier;

    const spellSaveDC =
      spell.savingThrow && typeof spell.savingThrow.dc === "number"
        ? spell.savingThrow.dc
        : caster.spellcasting.spellSaveDC || 10;

    const result = totalSave >= spellSaveDC ? "success" : "fail";

    return { participantId: st.participantId, ability, roll: st.roll, result };
  });

  return {
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
}
