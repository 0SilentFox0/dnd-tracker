/**
 * Типи та константи для виконання тригерів скілів
 */

import type { BattleParticipant } from "@/types/battle";

/** Результат виконання тригера скіла */
export interface SkillTriggerExecutionResult {
  participant: BattleParticipant;
  executedSkills: Array<{
    skillId: string;
    skillName: string;
    effects: string[];
  }>;
  messages: string[];
}

/** 4 руни для Рунічної атаки: +1 ініціатива, +1 AC, +10 HP, +1 мораль */
export const RUNIC_ATTACK_RUNES = [
  { type: "initiative", value: 1, label: "ініціатива +1" },
  { type: "armor", value: 1, label: "AC +1" },
  { type: "heal", value: 10, label: "HP +10" },
  { type: "morale", value: 1, label: "мораль +1" },
] as const;
