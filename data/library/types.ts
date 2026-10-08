import type { Ability } from "@/lib/utils/abilities/schema";
import type { SpellDefinition } from "@/lib/utils/spells/model/schema";

export interface LibraryEntry {
  key: string;
  name: string;
  description: string;
  appearanceDescription: string;
  iconKey?: string;
}

export interface LibrarySpellRaceModifier {
  raceKey: string;
  percent: number;
}

export interface LibrarySpell extends LibraryEntry {
  school: string;
  level: number;
  definition: Omit<SpellDefinition, "raceModifiers">;
  raceModifiers: LibrarySpellRaceModifier[];
}

export interface LibrarySkill extends LibraryEntry {
  abilities: Ability[];
  newSpellKey?: string;
  grantedSpellKey?: string;
}

export type LibraryPersonal = LibrarySkill;

export interface LibraryBranch extends LibraryEntry {
  color: string;
  spellSchool?: string;
  levels: LibrarySkill[];
  slots: LibrarySkill[][];
  spares: LibrarySkill[];
}

export type AbilityScoreKey = "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";

export interface LibraryRacePassive {
  name: string;
  iconKey: string;
  description: string;
  appearanceDescription: string;
  stats: Partial<Record<AbilityScoreKey, number>>;
  trait: Ability[];
}

export interface LibraryRace extends LibraryEntry {
  passive: LibraryRacePassive;
  color?: string;
  branchKeys: string[];
  spellSlotProgression: Array<{ level: number; slots: number }>;
  levels: LibrarySkill[];
  ultimate: LibrarySkill;
}

export interface LibrarySource {
  spells: LibrarySpell[];
  branches: LibraryBranch[];
  races: LibraryRace[];
  personal: LibraryPersonal[];
}

export interface Library extends LibrarySource {
  schools: string[];
  skills: LibrarySkill[];
  spellByKey: Map<string, LibrarySpell>;
  raceByKey: Map<string, LibraryRace>;
}
