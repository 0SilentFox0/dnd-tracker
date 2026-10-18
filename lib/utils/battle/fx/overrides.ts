import type { FxArchetype, FxElement } from "./types";

export const SPELL_FX_OVERRIDES: Record<string, { archetype?: FxArchetype; element?: FxElement }> = {
  "Рій ос": { archetype: "swarm", element: "nature" },
  "Землетрус": { archetype: "quake", element: "earth" },
  "Корені": { archetype: "entangle", element: "nature" },
  "Сплутування": { archetype: "entangle", element: "nature" },
  "Прикликання елементаля: Вогонь": { element: "fire" },
  "Прикликання елементаля: Вода": { element: "cold" },
  "Прикликання елементаля: Земля": { element: "earth" },
  "Прикликання елементаля: Повітря": { element: "lightning" },
  "Аватар": { element: "necrotic" },
  "Призив Фенікса": { element: "fire" },
  "Кам'яні шипи": { element: "earth" },
  "Метеоритний дощ": { archetype: "meteor", element: "fire" },
  "Вампіризм": { element: "fury" },
  "Поспіх": { archetype: "haste", element: "wind" },
  "Потойбічна стріла": { archetype: "eldritch", element: "fire" },
  "Сповільнення": { archetype: "slow", element: "arcane" },
  "Кам'яна шкіра": { archetype: "stoneskin", element: "earth" },
  "Телепортація": { archetype: "teleport", element: "arcane" },
};
