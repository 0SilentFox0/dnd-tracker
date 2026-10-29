/* eslint-disable no-restricted-syntax -- DND_SKILL_META.label feeds the character sheet payload; UI elsewhere reads gameTerms.dndSkills keys */
import { CORE_ABILITY_SCORES } from "./abilities";

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

export const isDndSkill = (id: string): id is (typeof DND_SKILLS)[number] => (DND_SKILLS as readonly string[]).includes(id);

const BASE_ABILITIES = CORE_ABILITY_SCORES;

export const DND_SAVING_THROWS = [
  BASE_ABILITIES[0].key,
  BASE_ABILITIES[1].key,
  BASE_ABILITIES[2].key,
  BASE_ABILITIES[3].key,
  BASE_ABILITIES[4].key,
  BASE_ABILITIES[5].key,
] as const;

export type DndSkill = (typeof DND_SKILLS)[number];

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

export const SKILL_NAME_MAX = 100;
