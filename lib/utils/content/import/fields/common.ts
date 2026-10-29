import { ABILITY_KEYS, ABILITY_LABELS, ABILITY_SHORT_LABELS, CORE_ABILITY_SCORES } from "@/lib/constants/abilities";
import { ENUM_LABELS, FIELD_ALIASES, LEGACY_ABILITY_SHORT, NUMBER_WORDS } from "@/lib/constants/import-aliases";
import type { ImportField, ImportSpec } from "@/types/content-import";

export type FieldDef = Omit<ImportField, "aliases" | "labelKey">;

export type SpecDef = Omit<ImportSpec, "fields"> & { fields: readonly FieldDef[] };

export const ABILITY_ENUM = {
  enumValues: ABILITY_KEYS,
  enumLabels: Object.fromEntries(CORE_ABILITY_SCORES.map((a) => [a.key, [ABILITY_LABELS[a.key], ABILITY_SHORT_LABELS[a.key], a.abbreviation, ...(LEGACY_ABILITY_SHORT[a.key] ?? [])]])) as Record<string, string[]>,
};

export const optionLabels = (options: ReadonlyArray<{ value: string; label: string }>): Record<string, string[]> => Object.fromEntries(options.map((o) => [o.value, [o.label]]));

export const recordLabels = (labels: Readonly<Record<string, string>>): Record<string, string[]> => Object.fromEntries(Object.entries(labels).map(([value, label]) => [value, [label]]));

export const nameField = (): FieldDef => ({ key: "name", type: "string", required: true });

export const textField = (key: string): FieldDef => ({ key, type: "string" });

export const jsonField = (key: string): FieldDef => ({ key, type: "json" });

export const abilitiesField = (): FieldDef => ({ key: "abilities", type: "abilitiesText" });

export function defineSpec({ kind, fields, ...rest }: SpecDef): ImportSpec {
  return {
    kind,
    ...rest,
    fields: fields.map((f) => {
      const words = NUMBER_WORDS[kind][f.key];

      const labels = ENUM_LABELS[kind]?.[f.key];

      return {
        ...f,
        labelKey: `contentImport.fields.${kind}.${f.key}`,
        aliases: FIELD_ALIASES[kind][f.key] ?? [],
        ...(words && { numberWords: words }),
        ...(labels && { enumLabels: labels }),
      };
    }),
  };
}
