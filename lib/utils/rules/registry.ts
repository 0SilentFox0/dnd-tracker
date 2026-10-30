/* eslint-disable no-restricted-syntax -- labels go into the source-sync response as item names; the editor renders rules.mechanics.<key> */
import type { Ruleset } from "./schema";

export type MechanicKey = keyof Ruleset;

export const MECHANIC_REGISTRY = {
  morale: { label: "Мораль" },
  criticals: { label: "Критичні удари" },
  formulas: { label: "Формули" },
  heroScaling: { label: "Сила героїв" },
  initiative: { label: "Ініціатива" },
  defaultAttacks: { label: "Базові атаки" },
  saves: { label: "Рятівні кидки" },
  deathSaves: { label: "Кидки смерті" },
  concentration: { label: "Концентрація" },
  actions: { label: "Дії 5e" },
  classes: { label: "Класи" },
  conditions: { label: "Стани 5e" },
  outOfCombat: { label: "Поза боєм" },
  encounters: { label: "Зустрічі" },
  items: { label: "Предмети" },
  spellIngredients: { label: "Інгредієнти заклинань" },
} satisfies Record<MechanicKey, { label: string }>;
