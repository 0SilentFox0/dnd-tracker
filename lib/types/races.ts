/**
 * Типи для системи рас
 */

export interface StatModifier {
  bonus?: boolean; // Дає + (бонус)
  nonNegative?: boolean; // Зробити невід'ємним (мінімум 0)
  alwaysZero?: boolean; // Завжди 0
}

export interface SpellSlotProgression {
  level: number; // Рівень магії (1-5)
  slots: number; // Максимальна кількість слотів
}

export interface Race {
  id: string;
  campaignId: string;
  name: string;
  availableSkills: string[];
  disabledSkills: string[];
  passiveAbility?: {
    description: string;
    statImprovements?: string;
    statModifiers?: Record<string, StatModifier>; // Ключ - назва характеристики (strength, dexterity, etc.)
  } | null;
  spellSlotProgression?: SpellSlotProgression[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RaceFormData {
  name: string;
  availableSkills: string[];
  disabledSkills: string[];
  passiveAbility?: {
    description: string;
    statImprovements?: string;
    statModifiers?: Record<string, StatModifier>;
  };
  spellSlotProgression?: SpellSlotProgression[];
}
