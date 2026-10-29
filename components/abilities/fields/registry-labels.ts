import type { Translator } from "@/lib/i18n/translator";
import type { FieldMeta, LocalizedFieldMeta } from "@/lib/utils/abilities/registry/fields";
import { CONDITION_5E_KEYS } from "@/lib/utils/abilities/schema/kinds";

const SET_PREFIX: Record<string, string> = { stat: "stats", "filter.kind": "damageFilters", target: "targets" };

export const optionSetKey = (field: string) => SET_PREFIX[field] ?? `options.${field}`;

// the owner key (`effects.dot`, `flags.sense`, …) overrides the shared label only where the text differs
const pick = (tr: Translator, own: string, shared: string) => (tr.has(own) ? tr(own) : tr(shared));

export const fieldLabel = (tr: Translator, owner: string, name: string) => pick(tr, `${owner}.fields.${name}`, `fields.${name}`);

export const optionLabel = (tr: Translator, owner: string, field: string, value: string) =>
  pick(tr, `${owner}.${optionSetKey(field)}.${value}`, `${optionSetKey(field)}.${value}`);

export function localizeField(tr: Translator, owner: string, meta: FieldMeta | LocalizedFieldMeta): LocalizedFieldMeta {
  return {
    ...meta,
    label: fieldLabel(tr, owner, meta.name),
    options: meta.options?.map((o) => ({
      value: o.value,
      label: optionLabel(tr, owner, meta.name, o.value),
      ...(meta.name === "condition" && { group: tr(`optionGroups.${(CONDITION_5E_KEYS as readonly string[]).includes(o.value) ? "conditions5e" : "mechanicalConditions"}`) }),
    })),
  };
}
