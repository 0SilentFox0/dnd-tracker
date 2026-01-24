/**
 * Утиліти для виконання ефектів скілів з тригерів
 */

import { getSkillsByTrigger } from "./skill-triggers";

import { addActiveEffect } from "@/lib/utils/battle/battle-effects";
import type { BattleParticipant } from "@/types/battle";
import type { ActiveSkill } from "@/types/battle";
import type { SimpleSkillTrigger } from "@/types/skill-triggers";

/**
 * Результат виконання тригера скіла
 */
export interface SkillTriggerExecutionResult {
  participant: BattleParticipant;
  executedSkills: Array<{
    skillId: string;
    skillName: string;
    effects: string[];
  }>;
  messages: string[];
}

/**
 * Виконує ефекти скіла
 */
function executeSkillEffects(
  skill: ActiveSkill,
  participant: BattleParticipant,
  allParticipants: BattleParticipant[],
  currentRound: number
): {
  updatedParticipant: BattleParticipant;
  effects: string[];
  messages: string[];
} {
  let updatedParticipant = { ...participant };

  const effects: string[] = [];

  const messages: string[] = [];

  // Застосовуємо ефекти зі скіла
  for (const effect of skill.effects) {
    // Різні типи ефектів обробляються по-різному
    switch (effect.type) {
      case "melee_damage_percent":
      case "ranged_damage_percent":
      case "spell_damage_percent":
        // Відсоткові бонуси до урону - застосовуються при розрахунку урону
        effects.push(`${effect.type}: +${effect.value}%`);
        break;

      case "hp_bonus":
      case "ac_bonus":
      case "speed_bonus":
        // Бонуси до характеристик - додаємо як activeEffect
        const effectName = `${skill.name} - ${effect.type}`;

        const newEffects = addActiveEffect(
          updatedParticipant,
          {
            id: `skill-${skill.skillId}-${effect.type}`,
            name: effectName,
            type: effect.value > 0 ? "buff" : "debuff",
            duration: 1, // Тривалість залежить від типу тригера
            effects: [
              {
                type: effect.type,
                value: effect.value,
                isPercentage: effect.isPercentage,
              },
            ],
          },
          currentRound
        );

        updatedParticipant = {
          ...updatedParticipant,
          battleData: {
            ...updatedParticipant.battleData,
            activeEffects: newEffects,
          },
        };
        effects.push(`${effect.type}: +${effect.value}`);
        messages.push(`✨ ${skill.name}: ${effect.type} +${effect.value}`);
        break;

      default:
        // Інші типи ефектів
        effects.push(`${effect.type}: ${effect.value}`);
        break;
    }
  }

  return {
    updatedParticipant,
    effects,
    messages,
  };
}

/**
 * Виконує всі скіли з певним тригером для учасника
 */
export function executeSkillsByTrigger(
  participant: BattleParticipant,
  triggerType: SimpleSkillTrigger,
  allParticipants: BattleParticipant[],
  context?: {
    target?: BattleParticipant;
    currentRound?: number;
    isOwnerAction?: boolean;
  }
): SkillTriggerExecutionResult {
  let updatedParticipant = { ...participant };

  const executedSkills: Array<{
    skillId: string;
    skillName: string;
    effects: string[];
  }> = [];

  const messages: string[] = [];

  if (!updatedParticipant.battleData.activeSkills || updatedParticipant.battleData.activeSkills.length === 0) {
    return {
      participant: updatedParticipant,
      executedSkills: [],
      messages: [],
    };
  }

  // Отримуємо всі скіли з потрібним тригером
  const skillsToExecute = getSkillsByTrigger(
    updatedParticipant.battleData.activeSkills,
    triggerType,
    updatedParticipant,
    allParticipants,
    context
  );

  // Виконуємо кожен скіл
  for (const skill of skillsToExecute) {
    const executionResult = executeSkillEffects(
      skill,
      updatedParticipant,
      allParticipants,
      context?.currentRound || 1
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
 * Виконує тригери для всіх учасників на початку раунду
 */
export function executeStartOfRoundTriggers(
  allParticipants: BattleParticipant[],
  currentRound: number
): {
  updatedParticipants: BattleParticipant[];
  messages: string[];
} {
  const updatedParticipants: BattleParticipant[] = [];

  const allMessages: string[] = [];

  for (const participant of allParticipants) {
    const result = executeSkillsByTrigger(
      participant,
      "startRound",
      allParticipants,
      {
        currentRound,
      }
    );

    updatedParticipants.push(result.participant);
    allMessages.push(...result.messages);
  }

  return {
    updatedParticipants,
    messages: allMessages,
  };
}

/**
 * Виконує тригери перед атакою
 */
export function executeBeforeAttackTriggers(
  attacker: BattleParticipant,
  target: BattleParticipant,
  allParticipants: BattleParticipant[],
  isOwnerAction: boolean
): {
  updatedAttacker: BattleParticipant;
  messages: string[];
} {
  const triggerType = isOwnerAction ? "beforeOwnerAttack" : "beforeEnemyAttack";

  const result = executeSkillsByTrigger(
    attacker,
    triggerType,
    allParticipants,
    {
      target,
      isOwnerAction,
    }
  );

  return {
    updatedAttacker: result.participant,
    messages: result.messages,
  };
}

/**
 * Виконує тригери після атаки
 */
export function executeAfterAttackTriggers(
  attacker: BattleParticipant,
  target: BattleParticipant,
  allParticipants: BattleParticipant[],
  isOwnerAction: boolean
): {
  updatedAttacker: BattleParticipant;
  messages: string[];
} {
  const triggerType = isOwnerAction ? "afterOwnerAttack" : "afterEnemyAttack";

  const result = executeSkillsByTrigger(
    attacker,
    triggerType,
    allParticipants,
    {
      target,
      isOwnerAction,
    }
  );

  return {
    updatedAttacker: result.participant,
    messages: result.messages,
  };
}

/**
 * Виконує тригери перед кастом заклинання
 */
export function executeBeforeSpellCastTriggers(
  caster: BattleParticipant,
  target: BattleParticipant | undefined,
  allParticipants: BattleParticipant[],
  isOwnerAction: boolean
): {
  updatedCaster: BattleParticipant;
  messages: string[];
} {
  const triggerType = isOwnerAction ? "beforeOwnerSpellCast" : "beforeEnemySpellCast";

  const result = executeSkillsByTrigger(
    caster,
    triggerType,
    allParticipants,
    {
      target,
      isOwnerAction,
    }
  );

  return {
    updatedCaster: result.participant,
    messages: result.messages,
  };
}

/**
 * Виконує тригери після касту заклинання
 */
export function executeAfterSpellCastTriggers(
  caster: BattleParticipant,
  target: BattleParticipant | undefined,
  allParticipants: BattleParticipant[],
  isOwnerAction: boolean
): {
  updatedCaster: BattleParticipant;
  messages: string[];
} {
  const triggerType = isOwnerAction ? "afterOwnerSpellCast" : "afterEnemySpellCast";

  const result = executeSkillsByTrigger(
    caster,
    triggerType,
    allParticipants,
    {
      target,
      isOwnerAction,
    }
  );

  return {
    updatedCaster: result.participant,
    messages: result.messages,
  };
}
