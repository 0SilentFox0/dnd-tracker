/**
 * Константи для навичок D&D 5e
 */
import { ABILITY_SCORES } from "./abilities";

export const DND_SKILLS = [
  "acrobatics",
  "animalHandling",
  "arcana",
  "athletics",
  "deception",
  "history",
  "insight",
  "intimidation",
  "investigation",
  "medicine",
  "nature",
  "perception",
  "performance",
  "persuasion",
  "religion",
  "sleightOfHand",
  "stealth",
  "survival",
] as const;

// Витягуємо основні характеристики для saving throws (перші 6 елементів)
const BASE_ABILITIES = ABILITY_SCORES.slice(0, 6);

export const DND_SAVING_THROWS = [
  BASE_ABILITIES[0].key,
  BASE_ABILITIES[1].key,
  BASE_ABILITIES[2].key,
  BASE_ABILITIES[3].key,
  BASE_ABILITIES[4].key,
  BASE_ABILITIES[5].key,
] as const;

export type DndSkill = (typeof DND_SKILLS)[number];
export type DndSavingThrow = (typeof DND_SAVING_THROWS)[number];

export const DND_SKILL_META: Record<DndSkill, { label: string; ability: "strength" | "dexterity" | "intelligence" | "wisdom" | "charisma" }> = {
  acrobatics: { label: "Акробатика", ability: "dexterity" },
  animalHandling: { label: "Поводження з тваринами", ability: "wisdom" },
  arcana: { label: "Магія", ability: "intelligence" },
  athletics: { label: "Атлетика", ability: "strength" },
  deception: { label: "Обман", ability: "charisma" },
  history: { label: "Історія", ability: "intelligence" },
  insight: { label: "Проникливість", ability: "wisdom" },
  intimidation: { label: "Залякування", ability: "charisma" },
  investigation: { label: "Розслідування", ability: "intelligence" },
  medicine: { label: "Медицина", ability: "wisdom" },
  nature: { label: "Природа", ability: "intelligence" },
  perception: { label: "Сприйняття", ability: "wisdom" },
  performance: { label: "Виступ", ability: "charisma" },
  persuasion: { label: "Переконання", ability: "charisma" },
  religion: { label: "Релігія", ability: "intelligence" },
  sleightOfHand: { label: "Спритність рук", ability: "dexterity" },
  stealth: { label: "Скритність", ability: "dexterity" },
  survival: { label: "Виживання", ability: "wisdom" },
};
