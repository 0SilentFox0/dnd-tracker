"use client";

import { useTranslations } from "next-intl";

import { FieldErrors } from "@/components/abilities/FieldErrors";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LabeledInput } from "@/components/ui/labeled-input";
import { INGREDIENT_MIN_GP_MAX, INGREDIENT_NAME_MAX, INGREDIENT_QTY_MAX } from "@/lib/constants/spell-ingredients";
import type { SpellIngredient } from "@/lib/schemas/spell-ingredients";

export interface IngredientRowProps {
  index: number;
  ingredient: SpellIngredient;
  duplicate: boolean;
  onChange: (patch: Partial<SpellIngredient>) => void;
  onRemove: () => void;
}

export function IngredientRow({ index, ingredient, duplicate, onChange, onRemove }: IngredientRowProps) {
  const t = useTranslations("spells.ingredients");

  const id = `ingredient-${index}`;

  return (
    <div className="space-y-3 rounded-md border border-hud-line p-3" data-testid="ingredient-row">
      <LabeledInput id={`${id}-name`} className="min-h-11" label={t("name")} value={ingredient.name} maxLength={INGREDIENT_NAME_MAX} onChange={(e) => onChange({ name: e.target.value })} aria-invalid={duplicate} />
      <FieldErrors errors={duplicate ? ["spells.ingredients.duplicate"] : []} />
      <div className="grid grid-cols-2 gap-3">
        <LabeledInput id={`${id}-qty`} className="min-h-11" label={t("qty")} type="number" min={1} max={INGREDIENT_QTY_MAX} value={ingredient.qty} onChange={(e) => onChange({ qty: Math.max(1, Math.min(INGREDIENT_QTY_MAX, Math.trunc(Number(e.target.value)) || 1)) })} />
        <LabeledInput id={`${id}-min-gp`} className="min-h-11" label={t("minGp")} type="number" min={0} max={INGREDIENT_MIN_GP_MAX} value={ingredient.minGp ?? ""} onChange={(e) => onChange({ minGp: e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)) })} />
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <Checkbox checked={ingredient.consumed} onCheckedChange={(on) => onChange({ consumed: on === true })} />
        {t("consumed")}
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <Checkbox checked={ingredient.focus} onCheckedChange={(on) => onChange({ focus: on === true })} />
        {t("focus")}
      </label>
      <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={onRemove}>
        {t("remove")}
      </Button>
    </div>
  );
}
