import type { AbilityKey } from "@/lib/constants/abilities";
import type { ClassCaster } from "@/lib/constants/classes";
import type { Ability } from "@/types/abilities";

export type { ClassCaster };
export type HitDie = 6 | 8 | 10 | 12;

export interface ClassFeature {
  level: number;
  abilities: Ability[];
}

export interface Subclass {
  id: string;
  name: string;
  features: ClassFeature[];
}

export interface GameClassData {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  hitDie: HitDie;
  savingThrows: AbilityKey[];
  proficiencies: { armor: string[]; weapons: string[]; tools: string[] };
  skillChoices: { count: number; from: string[] };
  caster: ClassCaster;
  spellcastingAbility: AbilityKey | null;
  features: ClassFeature[];
  subclassLevel: number | null;
  subclasses: Subclass[];
}

export interface CharacterClassEntry {
  classId: string;
  subclassId?: string | null;
  level: number;
}

export interface ClassLevelUpPick {
  classId?: string;
  subclassId?: string;
}

/** запис персонажа з розв'язаним класом; class === null — клас не знайдено */
export interface ResolvedClassEntry extends CharacterClassEntry {
  class: GameClassData | null;
  subclass: Subclass | null;
}

export type ClassFormData = Omit<GameClassData, "id">;
