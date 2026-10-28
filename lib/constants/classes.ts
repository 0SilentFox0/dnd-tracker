import type { HitDie } from "@/types/classes";

export const HIT_DICE: readonly HitDie[] = [6, 8, 10, 12];

export const CLASS_CASTERS = ["none", "full", "half", "third", "pact"] as const;

export type ClassCaster = (typeof CLASS_CASTERS)[number];

export const CLASS_CASTER_LABELS: Record<ClassCaster, string> = {
  none: "Не заклинач",
  full: "Повний заклинач",
  half: "Половинний заклинач",
  third: "Третина заклинача",
  pact: "Пакт",
};

export const MAX_CLASS_LEVEL = 20;

export const CLASS_COLUMN_KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const MAX_CLASS_COLUMNS = 12;
