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

export const DND_SKILL_META: Record<DndSkill, { ability: "strength" | "dexterity" | "intelligence" | "wisdom" | "charisma" }> = {
  acrobatics: { ability: "dexterity" },
  animalHandling: { ability: "wisdom" },
  arcana: { ability: "intelligence" },
  athletics: { ability: "strength" },
  deception: { ability: "charisma" },
  history: { ability: "intelligence" },
  insight: { ability: "wisdom" },
  intimidation: { ability: "charisma" },
  investigation: { ability: "intelligence" },
  medicine: { ability: "wisdom" },
  nature: { ability: "intelligence" },
  perception: { ability: "wisdom" },
  performance: { ability: "charisma" },
  persuasion: { ability: "charisma" },
  religion: { ability: "intelligence" },
  sleightOfHand: { ability: "dexterity" },
  stealth: { ability: "dexterity" },
  survival: { ability: "wisdom" },
};

export const SKILL_NAME_MAX = 100;
