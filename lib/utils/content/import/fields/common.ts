import { ABILITY_KEYS, ABILITY_LABELS, ABILITY_SHORT_LABELS, CORE_ABILITY_SCORES } from "@/lib/constants/abilities";
import type { ImportField } from "@/types/content-import";

// short labels of the old unit CSV
const LEGACY_SHORT: Record<string, string[]> = { dexterity: ["ЛОВ"], wisdom: ["МДР"] };

export const ABILITY_ENUM = {
  enumValues: ABILITY_KEYS,
  enumLabels: Object.fromEntries(CORE_ABILITY_SCORES.map((a) => [a.key, [ABILITY_LABELS[a.key], ABILITY_SHORT_LABELS[a.key], a.abbreviation, ...(LEGACY_SHORT[a.key] ?? [])]])) as Record<string, string[]>,
};

export const optionLabels = (options: ReadonlyArray<{ value: string; label: string }>): Record<string, string[]> => Object.fromEntries(options.map((o) => [o.value, [o.label]]));

export const recordLabels = (labels: Readonly<Record<string, string>>): Record<string, string[]> => Object.fromEntries(Object.entries(labels).map(([value, label]) => [value, [label]]));

const EMPTY: readonly [string, string] = ["", ""];

export const nameField = (examples: readonly [string, string]): ImportField => ({ key: "name", label: "Назва", aliases: ["назва", "name", "ім'я"], type: "string", required: true, examples });

export const textField = (key: string, label: string, aliases: readonly string[], examples: readonly [string, string] = EMPTY): ImportField => ({ key, label, aliases, type: "string", examples });

export const jsonField = (key: string, label: string, aliases: readonly string[], examples: readonly [string, string] = EMPTY): ImportField => ({ key, label, aliases, type: "json", examples });

export const abilitiesField = (examples: readonly [string, string] = EMPTY): ImportField => ({ key: "abilities", label: "Здібності", aliases: ["abilities"], type: "abilitiesText", examples });
