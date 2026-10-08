import type { ArtifactGridSlotKey } from "@/lib/constants/artifacts";
import type { Ability } from "@/lib/utils/abilities/schema";
import type { SpellDefinition } from "@/lib/utils/spells/model/schema";
import type { LevelScaling } from "@/lib/utils/units/level-scaling";

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

export interface LibraryArtifact extends LibraryEntry {
  slot: ArtifactGridSlotKey;
  rarity: "epic" | "legendary";
  abilities: Ability[];
  modifiers?: Array<{ type: string; value: string }>;
}

export interface LibraryArtifactSet extends LibraryEntry {
  heroName: string;
  artifacts: LibraryArtifact[];
  abilities: Ability[];
}

export type UnitRole = "base" | "upgrade" | "alt";

export interface LibraryUnitAttack {
  name: string;
  type: "melee" | "ranged";
  dice: string;
  damageType: string;
  targets?: number;
}

export interface LibraryUnit {
  key: string;
  name: string;
  raceKey: string | null;
  tier: number;
  role: UnitRole;
  hp: number;
  ac: number;
  attackBonus: number;
  initiative: number;
  attacks: LibraryUnitAttack[];
  abilities: Ability[];
  spellKeys?: string[];
  flying?: boolean;
  levelScaling?: LevelScaling;
}

export interface LibrarySource {
  spells: LibrarySpell[];
  branches: LibraryBranch[];
  races: LibraryRace[];
  personal: LibraryPersonal[];
  artifactSets: LibraryArtifactSet[];
  units: LibraryUnit[];
}

export interface Library extends LibrarySource {
  schools: string[];
  skills: LibrarySkill[];
  spellByKey: Map<string, LibrarySpell>;
  raceByKey: Map<string, LibraryRace>;
  unitByKey: Map<string, LibraryUnit>;
}
