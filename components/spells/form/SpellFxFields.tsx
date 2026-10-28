"use client";

import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import type { SpellFx } from "@/lib/utils/battle/fx/spells";
import { FX_ARCHETYPES, FX_AURA_KINDS, FX_ELEMENTS } from "@/lib/utils/battle/fx/types";

interface SpellFxFieldsProps {
  value: SpellFx;
  onChange: (fx: SpellFx) => void;
}

const toOptions = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }));

const FIELDS = [
  { key: "archetype", label: "Анімація", options: toOptions(FX_ARCHETYPES) },
  { key: "element", label: "Стихія", options: toOptions(FX_ELEMENTS) },
  { key: "aura", label: "Аура", options: toOptions(FX_AURA_KINDS) },
] as const;

export function SpellFxFields({ value, onChange }: SpellFxFieldsProps) {
  return (
    <>
      {FIELDS.map(({ key, label, options }) => (
        <div key={key} className="min-w-0">
          <Label htmlFor={`fx-${key}`}>{label}</Label>
          <SelectField
            id={`fx-${key}`}
            value={value[key] ?? ""}
            onValueChange={(v) => onChange({ ...value, [key]: v || undefined })}
            options={options}
            allowNone
            noneLabel="Авто"
            placeholder="Авто"
          />
        </div>
      ))}
    </>
  );
}
