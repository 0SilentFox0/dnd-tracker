import type { AbilityKey } from "@/lib/constants/abilities";
import type { ClassCaster } from "@/lib/constants/classes";
import type { Ability } from "@/types/abilities";
import type { Choice, ChoiceKind, Picks } from "@/types/choices";

export type { ClassCaster };
export type HitDie = 6 | 8 | 10 | 12;

export interface ClassFeature {
  level: number;
  description?: string;
  abilities: Ability[];
  choices?: Choice[];
}

export interface Subclass {
  id: string;
  name: string;
  features: ClassFeature[];
}

export interface ClassColumn {
  key: string;
  label: string;
  /** рівно 20 клітинок: "2", "+2", "1d6", "D8", "+10 ft.", "" */
  values: string[];
  /** колонка — максимум спільного пулу вмінь класу */
  pool?: { rest: "short" | "long" };
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
  columns?: ClassColumn[];
  spellList?: string | null;
}

export interface CharacterClassEntry {
  classId: string;
  subclassId?: string | null;
  level: number;
  choices?: Picks;
}

export interface ClassLevelUpPick {
  classId?: string;
  subclassId?: string;
  choices?: Picks;
}

/** запис персонажа з розв'язаним класом; class === null — клас не знайдено */
export interface ResolvedClassEntry extends CharacterClassEntry {
  class: GameClassData | null;
  subclass: Subclass | null;
}

export type ClassFormData = Omit<GameClassData, "id">;

export interface ProgressionItem {
  key: string;
  name: string;
  summary: string;
  description?: string;
}

export interface ProgressionPick {
  key: string;
  kind: ChoiceKind | "subclass";
  label: string;
  required: number;
  done: number | null;
  status: "open" | "done" | "locked" | "template";
}

export interface ProgressionRow {
  level: number;
  state: "reached" | "current" | "next" | "future" | "template";
  base: ProgressionItem[];
  bySubclass: Record<string, ProgressionItem[]>;
  picks: ProgressionPick[];
}

export interface ClassProgression {
  classId: string;
  className: string;
  color: string | null;
  subclasses: { id: string; name: string; chosen: boolean }[];
  subclassLevel: number | null;
  rows: ProgressionRow[];
}
