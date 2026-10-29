"use client";


import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { useTranslator } from "@/lib/i18n/use-translator";
import type { SpellFx } from "@/lib/utils/battle/fx/spells";
import { FX_ARCHETYPES, FX_AURA_KINDS, FX_ELEMENTS } from "@/lib/utils/battle/fx/types";

interface SpellFxFieldsProps {
  value: SpellFx;
  onChange: (fx: SpellFx) => void;
}

const FIELDS = [
  { key: "archetype", label: "animation", group: "archetypes", values: FX_ARCHETYPES },
  { key: "element", label: "element", group: "elements", values: FX_ELEMENTS },
  { key: "aura", label: "aura", group: "auras", values: FX_AURA_KINDS },
] as const;

export function SpellFxFields({ value, onChange }: SpellFxFieldsProps) {
  const t = useTranslator();

  return (
    <>
      {FIELDS.map(({ key, label, group, values }) => (
        <div key={key} className="min-w-0">
          <Label htmlFor={`fx-${key}`}>{t(`spellEditor.fx.${label}`)}</Label>
          <SelectField
            id={`fx-${key}`}
            value={value[key] ?? ""}
            onValueChange={(v) => onChange({ ...value, [key]: v || undefined })}
            options={values.map((v) => ({ value: v, label: t(`spells.fx.${group}.${v}`) }))}
            allowNone
            noneLabel={t("spellEditor.fx.auto")}
            placeholder={t("spellEditor.fx.auto")}
          />
        </div>
      ))}
    </>
  );
}
