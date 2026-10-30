import type { HitDie } from "@/types/classes";

export const HIT_DICE: readonly HitDie[] = [6, 8, 10, 12];

export const CLASS_CASTERS = ["none", "full", "half", "third", "pact"] as const;

export type ClassCaster = (typeof CLASS_CASTERS)[number];

export const MAX_CLASS_LEVEL = 20;

export const DEFAULT_SUBCLASS_LEVEL = 3;

export const CLASS_COLUMN_KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const MAX_CLASS_COLUMNS = 12;

/** Мультикласова таблиця слотів за рівнем заклинача (індекс = рівень − 1, значення = слоти рівнів 1…). */
export const MULTICLASS_SLOTS: readonly (readonly number[])[] = [
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

export const PACT_SLOTS: readonly { max: number; level: number }[] = [
  { max: 1, level: 1 },
  { max: 2, level: 1 },
  { max: 2, level: 2 },
  { max: 2, level: 2 },
  { max: 2, level: 3 },
  { max: 2, level: 3 },
  { max: 2, level: 4 },
  { max: 2, level: 4 },
  { max: 2, level: 5 },
  { max: 2, level: 5 },
  { max: 3, level: 5 },
  { max: 3, level: 5 },
  { max: 3, level: 5 },
  { max: 3, level: 5 },
  { max: 3, level: 5 },
  { max: 3, level: 5 },
  { max: 4, level: 5 },
  { max: 4, level: 5 },
  { max: 4, level: 5 },
  { max: 4, level: 5 },
];

/** Скільки рівнів класу дає один рівень заклинача (full = 1, half = 2, third = 3). */
export const CASTER_LEVEL_DIVISOR: Partial<Record<ClassCaster, number>> = { full: 1, half: 2, third: 3 };
