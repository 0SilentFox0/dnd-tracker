/**
 * Константи для навичок D&D 5e
 */

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

export const DND_SAVING_THROWS = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
] as const;

export type DndSkill = (typeof DND_SKILLS)[number];
export type DndSavingThrow = (typeof DND_SAVING_THROWS)[number];
