/**
 * Виконання простих тригерів: startRound, before/after attack, before/after spellCast, onLethalDamage
 */

import { evaluateSkillTrigger, getSkillsByTrigger } from "../triggers";
import type { SkillTriggerExecutionResult } from "../types/execution";
import { executeSkillEffects } from "./effects";

import type { SkillTriggerContext } from "@/lib/utils/battle/triggers";
import type { BattleParticipant } from "@/types/battle";
import type { SimpleSkillTrigger } from "@/types/skill-triggers";

/**
 * Виконує всі скіли з певним тригером для учасника
 */
export function executeSkillsByTrigger(
  participant: BattleParticipant,
  triggerType: SimpleSkillTrigger,
  allParticipants: BattleParticipant[],
  context?: Pick<
    SkillTriggerContext,
    "target" | "currentRound" | "isOwnerAction"
  >,
): SkillTriggerExecutionResult {
  let updatedParticipant = { ...participant };

  const executedSkills: SkillTriggerExecutionResult["executedSkills"] = [];

  const messages: string[] = [];

  if (
    !updatedParticipant.battleData.activeSkills ||
    updatedParticipant.battleData.activeSkills.length === 0
  ) {
    return {
      participant: updatedParticipant,
      executedSkills: [],
      messages: [],
    };
  }

  const skillsToExecute = getSkillsByTrigger(
    updatedParticipant.battleData.activeSkills,
    triggerType,
    updatedParticipant,
    allParticipants,
    context,
  );

  for (const skill of skillsToExecute) {
    console.info("[тригер]", triggerType, {
      skill: skill.name,
      skillId: skill.skillId,
      participant: updatedParticipant.basicInfo.name,
    });

    const executionResult = executeSkillEffects(
      skill,
      updatedParticipant,
      allParticipants,
      context?.currentRound || 1,
    );

    updatedParticipant = executionResult.updatedParticipant;
    executedSkills.push({
      skillId: skill.skillId,
      skillName: skill.name,
      effects: executionResult.effects,
    });
    messages.push(...executionResult.messages);
  }

  return {
    participant: updatedParticipant,
    executedSkills,
    messages,
  };
}

/**
 * Виконує лише complex-тригери, які стали істинними через зміну стану учасника
 */
export function executeComplexTriggersForChangedParticipant(
  allParticipants: BattleParticipant[],
  changedParticipantId: string,
  currentRound: number,
): {
  updatedParticipants: BattleParticipant[];
  messages: string[];
} {
  const byId = new Map(allParticipants.map((p) => [p.basicInfo.id, { ...p }]));

  const changedParticipant = byId.get(changedParticipantId);

  if (!changedParticipant) {
    return { updatedParticipants: allParticipants, messages: [] };
  }

  const messages: string[] = [];

  for (const participant of allParticipants) {
    const existingParticipant = byId.get(participant.basicInfo.id);

    if (!existingParticipant) continue;

    let currentParticipant = existingParticipant;

    const activeSkills = currentParticipant.battleData.activeSkills ?? [];

    for (const skill of activeSkills) {
      if (!skill.skillTriggers || skill.skillTriggers.length === 0) continue;

      const shouldExecute = skill.skillTriggers.some(
        (trigger) =>
          trigger.type === "complex" &&
          evaluateSkillTrigger(trigger, currentParticipant, {
            currentRound,
            allParticipants: [currentParticipant, changedParticipant],
          }),
      );

      if (!shouldExecute) continue;

      console.info("[тригер] complex", {
        skill: skill.name,
        skillId: skill.skillId,
        participant: currentParticipant.basicInfo.name,
        changedParticipant: changedParticipant.basicInfo.name,
      });

      const executionResult = executeSkillEffects(
        skill,
        currentParticipant,
        Array.from(byId.values()),
        currentRound,
      );

      currentParticipant = executionResult.updatedParticipant;
      byId.set(currentParticipant.basicInfo.id, currentParticipant);
      messages.push(...executionResult.messages);
    }
  }

  return {
    updatedParticipants: allParticipants.map(
      (p) => byId.get(p.basicInfo.id) ?? p,
    ),
    messages,
  };
}

/**
 * Виконує тригери для всіх учасників на початку раунду
 */
export function executeStartOfRoundTriggers(
  allParticipants: BattleParticipant[],
  currentRound: number,
): { updatedParticipants: BattleParticipant[]; messages: string[] } {
  const updatedParticipants: BattleParticipant[] = [];

  const allMessages: string[] = [];

  for (const participant of allParticipants) {
    const result = executeSkillsByTrigger(
      participant,
      "startRound",
      allParticipants,
      { currentRound },
    );

    updatedParticipants.push(result.participant);
    allMessages.push(...result.messages);
  }

  return { updatedParticipants, messages: allMessages };
}

/**
 * Виконує тригери перед атакою
 */
export function executeBeforeAttackTriggers(
  attacker: BattleParticipant,
  target: BattleParticipant,
  allParticipants: BattleParticipant[],
  isOwnerAction: boolean,
): { updatedAttacker: BattleParticipant; messages: string[] } {
  const triggerType = isOwnerAction ? "beforeOwnerAttack" : "beforeEnemyAttack";

  const result = executeSkillsByTrigger(
    attacker,
    triggerType,
    allParticipants,
    { target, isOwnerAction },
  );

  return { updatedAttacker: result.participant, messages: result.messages };
}

/**
 * Виконує тригери після атаки
 */
export function executeAfterAttackTriggers(
  attacker: BattleParticipant,
  target: BattleParticipant,
  allParticipants: BattleParticipant[],
  isOwnerAction: boolean,
): { updatedAttacker: BattleParticipant; messages: string[] } {
  const triggerType = isOwnerAction ? "afterOwnerAttack" : "afterEnemyAttack";

  const result = executeSkillsByTrigger(
    attacker,
    triggerType,
    allParticipants,
    { target, isOwnerAction },
  );

  return { updatedAttacker: result.participant, messages: result.messages };
}

/**
 * Виконує тригери перед кастом заклинання
 */
export function executeBeforeSpellCastTriggers(
  caster: BattleParticipant,
  target: BattleParticipant | undefined,
  allParticipants: BattleParticipant[],
  isOwnerAction: boolean,
): { updatedCaster: BattleParticipant; messages: string[] } {
  const triggerType = isOwnerAction
    ? "beforeOwnerSpellCast"
    : "beforeEnemySpellCast";

  const result = executeSkillsByTrigger(caster, triggerType, allParticipants, {
    target,
    isOwnerAction,
  });

  return { updatedCaster: result.participant, messages: result.messages };
}

/**
 * Виконує тригери після касту заклинання
 */
export function executeAfterSpellCastTriggers(
  caster: BattleParticipant,
  target: BattleParticipant | undefined,
  allParticipants: BattleParticipant[],
  isOwnerAction: boolean,
): { updatedCaster: BattleParticipant; messages: string[] } {
  const triggerType = isOwnerAction
    ? "afterOwnerSpellCast"
    : "afterEnemySpellCast";

  const result = executeSkillsByTrigger(caster, triggerType, allParticipants, {
    target,
    isOwnerAction,
  });

  return { updatedCaster: result.participant, messages: result.messages };
}

/**
 * Перевіряє survive_lethal (Битва до останнього): якщо HP <= 0, залишає 1 HP.
 */
export function checkSurviveLethal(
  participant: BattleParticipant,
  skillUsageCounts?: Record<string, number>,
): { survived: boolean; message: string | null } {
  for (const skill of participant.battleData.activeSkills) {
    if (!skill.skillTriggers) continue;

    const trigger = skill.skillTriggers.find(
      (t) => t.type === "simple" && t.trigger === "onLethalDamage",
    );

    if (!trigger) continue;

    if (trigger.modifiers?.oncePerBattle && skillUsageCounts) {
      if ((skillUsageCounts[skill.skillId] ?? 0) >= 1) continue;
    }

    const hasSurvive = skill.effects.some((e) => e.stat === "survive_lethal");

    if (!hasSurvive) continue;

    if (skillUsageCounts) {
      skillUsageCounts[skill.skillId] =
        (skillUsageCounts[skill.skillId] ?? 0) + 1;
    }

    return {
      survived: true,
      message: `💀 ${skill.name}: ${participant.basicInfo.name} вижив з 1 HP!`,
    };
  }

  return { survived: false, message: null };
}
