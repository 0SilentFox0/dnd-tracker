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
