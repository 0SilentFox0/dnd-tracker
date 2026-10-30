"use client";

import { useTranslations } from "next-intl";

import { optionSetKey } from "./fields/registry-labels";
import { FieldErrors } from "./FieldErrors";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { useTranslator } from "@/lib/i18n/use-translator";
import type { ParamDef, Recipe, RecipeValues } from "@/lib/utils/abilities/templates";

interface RecipeFormProps {
  recipe: Recipe;
  values: RecipeValues;
  onChange: (key: string, v: string | number) => void;
  issues: string[];
  name?: { value: string; onChange: (v: string) => void };
}

const SET_FIELD: Record<string, string> = { stat: "stat", damageType: "damageType", filter: "filter.kind", condition: "condition" };

export function RecipeForm({ recipe, values, onChange, issues, name }: RecipeFormProps) {
  const t = useTranslations("abilities.templates");

  const tr = useTranslator("abilityRegistry");

  const optionLabel = (p: ParamDef, value: string) => {
    const field = SET_FIELD[p.key] ?? SET_FIELD[p.kind];

    if (!field) return p.key === "delta" && Number(value) > 0 ? `+${value}` : value;

    return tr(`${optionSetKey(field)}.${value}`);
  };

  const control = (p: ParamDef) => {
    const id = `recipe-${recipe.id}-${p.key}`;

    const value = String(values[p.key] ?? "");

    if (p.options) {
      return <SelectField id={id} value={value} onValueChange={(v) => onChange(p.key, v)} options={p.options.map((o) => ({ value: o, label: optionLabel(p, o) }))} />;
    }

    if (p.kind === "dice") return <Input id={id} value={value} onChange={(e) => onChange(p.key, e.target.value)} />;

    return <Input id={id} type="number" inputMode="numeric" min={p.min} max={p.max} value={value} onChange={(e) => onChange(p.key, e.target.value)} />;
  };

  return (
    <div className="space-y-3">
      {name && (
        <div className="space-y-1">
          <Label htmlFor="recipe-name">{t("nameLabel")}</Label>
          <Input id="recipe-name" value={name.value} onChange={(e) => name.onChange(e.target.value)} />
        </div>
      )}
      {recipe.params.map((p) => (
        <div key={p.key} className="space-y-1">
          <Label htmlFor={`recipe-${recipe.id}-${p.key}`}>{tr(`templates.${recipe.id}.params.${p.key}`)}</Label>
          {control(p)}
          {p.kind === "dice" && <FieldErrors errors={issues} testId="recipe-errors" />}
        </div>
      ))}
    </div>
  );
}
