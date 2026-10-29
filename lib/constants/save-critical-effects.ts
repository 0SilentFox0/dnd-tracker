/* eslint-disable no-restricted-syntax -- name/description are copied into the stored activeEffects (uk data); the battle UI reads battleTerms.crits.* keys */
import type { CriticalEffect } from "@/lib/constants/critical-effects";

/** Нат. 20 на рятівному кидку цілі; `{attacker}` — кастер, `{target}` — ціль, що кидала. */
export const SAVE_SUCCESS_EFFECTS: CriticalEffect[] = [
  {
    id: 1,
    name: "Повне уникнення",
    description: "Шкода від заклинання = 0, навіть при «половині»",
    type: "success",
    flavorCount: 2,
    effect: { type: "negate_damage", target: "target" },
  },
  {
    id: 2,
    name: "Контр-ритм",
    description: "Наступна атака з Advantage",
    type: "success",
    flavorCount: 2,
    effect: { type: "advantage_next_attack", duration: 2, target: "target" },
  },
  {
    id: 3,
    name: "Контратака",
    description: "Додаткова дія наступного ходу",
    type: "success",
    flavorCount: 2,
    effect: { type: "extra_action", target: "target" },
  },
  {
    id: 4,
    name: "Гарт",
    description: "+2 КЗ до початку наступного ходу",
    type: "success",
    flavorCount: 2,
    effect: { type: "ac_buff", value: 2, duration: 1, target: "target" },
  },
  {
    id: 5,
    name: "Скидання",
    description: "Заклинання не накладає статусів",
    type: "success",
    flavorCount: 2,
    effect: { type: "negate_effects", target: "target" },
  },
  {
    id: 6,
    name: "Другий вдих",
    description: "Додаткова дія наступного ходу",
    type: "success",
    flavorCount: 2,
    effect: { type: "extra_action", target: "target" },
  },
];

/** Нат. 1 на рятівному кидку цілі. */
export const SAVE_FAIL_EFFECTS: CriticalEffect[] = [
  {
    id: 1,
    name: "Подвійна шкода",
    description: "Шкода від заклинання подвоюється для цієї цілі",
    type: "fail",
    flavorCount: 2,
    effect: { type: "double_damage", value: 2, target: "target" },
  },
  {
    id: 2,
    name: "Збитий з ніг",
    description: "Prone (лежачи)",
    type: "fail",
    flavorCount: 2,
    effect: { type: "prone", duration: 2, target: "target" },
  },
  {
    id: 3,
    name: "Збентеження",
    description: "Disadvantage на наступну атаку",
    type: "fail",
    flavorCount: 2,
    effect: { type: "disadvantage_next_attack", duration: 2, target: "target" },
  },
  {
    id: 4,
    name: "Прогалина в захисті",
    description: "−2 КЗ до початку наступного ходу",
    type: "fail",
    flavorCount: 2,
    effect: { type: "ac_debuff", value: -2, duration: 1, target: "target" },
  },
  {
    id: 5,
    name: "Втрата реакції",
    description: "Втрата реакції до наступного ходу",
    type: "fail",
    flavorCount: 2,
    effect: { type: "lose_reaction", duration: 1, target: "target" },
  },
  {
    id: 6,
    name: "Втрата бонусної дії",
    description: "Ціль втрачає Bonus Action наступного ходу",
    type: "fail",
    flavorCount: 2,
    effect: { type: "block_bonus_action", duration: 1, target: "target" },
  },
];
