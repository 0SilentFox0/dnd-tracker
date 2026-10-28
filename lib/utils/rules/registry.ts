import type { Ruleset } from "./schema";

export type MechanicKey = keyof Ruleset;

export const MECHANIC_REGISTRY = {
  morale: { label: "Мораль", description: "Перевірка d10 на початку ходу: позитивна мораль — шанс додаткового ходу, негативна — пропуск. Межа — максимальне значення ±N." },
  criticals: { label: "Критичні удари", description: "Поріг кріту і провалу на d20 та таблиці критичних ефектів." },
  formulas: { label: "Формули", description: "DC рятівного кидка = база + майстерність + модифікатор; бонус майстерності росте з рівнем героя." },
  heroScaling: { label: "Сила героїв", description: "Кубики шкоди героя за рівнем і формула HP." },
  initiative: { label: "Ініціатива", description: "Допустимий діапазон ініціативи героя." },
  defaultAttacks: { label: "Базові атаки", description: "Назви атак, які отримує герой без зброї." },
} satisfies Record<MechanicKey, { label: string; description: string }>;
