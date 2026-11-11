import type { Prisma } from "@prisma/client";

import type { Ability, ConversionIssue } from "@/lib/utils/abilities/schema";
import type { Choice } from "@/types/choices";

export interface StatModifier {
  bonus?: boolean; // Дає + (бонус)
  nonNegative?: boolean; // Зробити невід'ємним (мінімум 0)
  alwaysZero?: boolean; // Завжди 0
}

export interface SpellSlotProgression {
  level: number; // Рівень магії (1-5)
  slots: number; // Максимальна кількість слотів
}

export interface RacePassiveAbility {
  creatureType?: string;
  name?: string;
  icon?: string;
  description: string;
  appearanceDescription?: string;
  statImprovements?: string;
  // ключ — характеристика (strength, dexterity, …)
  statModifiers?: Record<string, StatModifier>;
}

export interface Race {
  abilities?: Ability[];
  icon?: string | null;
  color?: string | null;
  abilityIssues?: ConversionIssue[];
  choices?: Choice[];
  id: string;
  campaignId: string;
  name: string;
  availableSkills: string[];
  disabledSkills: string[];
  passiveAbility?: RacePassiveAbility | null;
  spellSlotProgression?: SpellSlotProgression[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RaceFormData {
  name: string;
  icon?: string;
  color?: string;
  availableSkills: string[];
  disabledSkills: string[];
  passiveAbility?: RacePassiveAbility;
  spellSlotProgression?: SpellSlotProgression[];
  abilities: Ability[];
  choices?: Choice[];
}

export type RaceRow = Prisma.RaceGetPayload<object>;
