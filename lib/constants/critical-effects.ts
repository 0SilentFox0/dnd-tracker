/**
 * Константи для критичних ефектів (Natural 20 та Natural 1)
 */

export interface CriticalEffect {
  id: number; // 1-10 для d10
  name: string;
  description: string;
  type: "success" | "fail";
  effect: {
    type: string;
    value?: number | string;
    duration?: number;
    target?: "self" | "target" | "next_turn";
  };
}

/**
 * Критична Удача (Natural 20 на d20) - випадковий ефект з d10
 */
export const CRITICAL_SUCCESS_EFFECTS: CriticalEffect[] = [
  {
    id: 1,
    name: "Подвійний урон",
    description: "Урон подвоюється (x2)",
    type: "success",
    effect: {
      type: "double_damage",
      value: 2,
    },
  },
  {
    id: 2,
    name: "Максимальний урон",
    description: "Урон = максимальне значення кубиків",
    type: "success",
    effect: {
      type: "max_damage",
    },
  },
  {
    id: 3,
    name: "Advantage на наступну атаку",
    description: "Наступна атака з Advantage",
    type: "success",
    effect: {
      type: "advantage_next_attack",
      duration: 1, // 1 атака
      target: "self",
    },
  },
  {
    id: 4,
    name: "Ослаблення захисту",
    description: "Ціль отримує −2 AC до початку її наступного ходу",
    type: "success",
    effect: {
      type: "ac_debuff",
      value: -2,
      duration: 1, // до наступного ходу цілі
      target: "target",
    },
  },
  {
    id: 5,
    name: "Додатковий урон",
    description: "Додатковий урон +1d6",
    type: "success",
    effect: {
      type: "additional_damage",
      value: "1d6",
    },
  },
  {
    id: 6,
    name: "Безкоштовна атака",
    description: "Безкоштовна додаткова атака (1 раз)",
    type: "success",
    effect: {
      type: "free_attack",
      duration: 1,
      target: "self",
    },
  },
  {
    id: 7,
    name: "Блокування бонусної дії",
    description: "Ворог втрачає Bonus Action наступного ходу",
    type: "success",
    effect: {
      type: "block_bonus_action",
      duration: 1,
      target: "target",
    },
  },
  {
    id: 8,
    name: "Ігнорування реакцій",
    description: "Атака ігнорує реакції цілі",
    type: "success",
    effect: {
      type: "ignore_reactions",
      target: "target",
    },
  },
  {
    id: 9,
    name: "Mark для Advantage",
    description: "Наступна атака по цілі з Advantage",
    type: "success",
    effect: {
      type: "advantage_on_target",
      duration: 1,
      target: "target",
    },
  },
  {
    id: 10,
    name: "Комбо-удар",
    description: "Ще одна атака з Disadvantage",
    type: "success",
    effect: {
      type: "combo_attack",
      value: "disadvantage",
      duration: 1,
      target: "self",
    },
  },
];

/**
 * Критична Невдача (Natural 1 на d20) - випадковий ефект з d10
 */
export const CRITICAL_FAIL_EFFECTS: CriticalEffect[] = [
  {
    id: 1,
    name: "Простий промах",
    description: "Промах без додаткових ефектів",
    type: "fail",
    effect: {
      type: "simple_miss",
    },
  },
  {
    id: 2,
    name: "Падіння",
    description: "Prone (лежачи)",
    type: "fail",
    effect: {
      type: "prone",
      duration: 1, // до кінця наступного ходу
      target: "self",
    },
  },
  {
    id: 3,
    name: "Disadvantage на наступну атаку",
    description: "Disadvantage на наступну атаку",
    type: "fail",
    effect: {
      type: "disadvantage_next_attack",
      duration: 1,
      target: "self",
    },
  },
  {
    id: 4,
    name: "Втрата бонусної дії",
    description: "Втрата Bonus Action цього ходу",
    type: "fail",
    effect: {
      type: "lose_bonus_action",
      duration: 1,
      target: "self",
    },
  },
  {
    id: 5,
    name: "Зменшений урон",
    description: "Урон ×0.5 (якщо попався)",
    type: "fail",
    effect: {
      type: "half_damage",
      value: 0.5,
    },
  },
  {
    id: 6,
    name: "Ослаблення захисту",
    description: "−2 AC до початку наступного ходу",
    type: "fail",
    effect: {
      type: "ac_debuff",
      value: -2,
      duration: 1,
      target: "self",
    },
  },
  {
    id: 7,
    name: "Провокація",
    description: "Провокує Opportunity Attack",
    type: "fail",
    effect: {
      type: "provoke_opportunity_attack",
      target: "self",
    },
  },
  {
    id: 8,
    name: "Втрата реакції",
    description: "Втрата реакції до наступного ходу",
    type: "fail",
    effect: {
      type: "lose_reaction",
      duration: 1,
      target: "self",
    },
  },
  {
    id: 9,
    name: "Mark для ворога",
    description: "Наступна атака по персонажу з Advantage",
    type: "fail",
    effect: {
      type: "advantage_on_self",
      duration: 1,
      target: "self",
    },
  },
  {
    id: 10,
    name: "Втрата дії",
    description: "Втрата дії (Action)",
    type: "fail",
    effect: {
      type: "lose_action",
      duration: 1,
      target: "self",
    },
  },
];

/**
 * Отримати критичний ефект по ID та типу
 */
export function getCriticalEffect(
  id: number,
  type: "success" | "fail"
): CriticalEffect | undefined {
  const effects =
    type === "success" ? CRITICAL_SUCCESS_EFFECTS : CRITICAL_FAIL_EFFECTS;
  return effects.find((effect) => effect.id === id);
}

/**
 * Отримати випадковий критичний ефект (для автоматичної генерації)
 */
export function getRandomCriticalEffect(
  type: "success" | "fail"
): CriticalEffect {
  const effects =
    type === "success" ? CRITICAL_SUCCESS_EFFECTS : CRITICAL_FAIL_EFFECTS;
  const randomId = Math.floor(Math.random() * effects.length) + 1;
  return getCriticalEffect(randomId, type) || effects[0];
}
