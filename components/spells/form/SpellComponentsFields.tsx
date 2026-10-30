"use client";

import { useTranslations } from "next-intl";

import { IngredientRow } from "./IngredientRow";
import type { SpellFormFieldsProps } from "./SpellFormBasicFields";

import { HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectField } from "@/components/ui/select-field";
import { INGREDIENT_PRESETS, type IngredientPresetId } from "@/lib/constants/spell-ingredients";
import { useSpellComponents } from "@/lib/hooks/spells";

const FLAG_KEYS = ["v", "s", "m"] as const;

export function SpellComponentsFields({ formData, setFormData }: SpellFormFieldsProps) {
  const t = useTranslations("spells.ingredients");

  const c = useSpellComponents({ data: formData, set: setFormData });

  return (
    <HudSection title={t("title")}>
      <div className="flex flex-wrap gap-x-6">
        {FLAG_KEYS.map((key) => (
          <label key={key} className="flex min-h-11 items-center gap-2 text-sm">
            <Checkbox checked={c.flags[key]} onCheckedChange={(on) => c.setFlag(key, on === true)} />
            {t(`flags.${key}`)}
          </label>
        ))}
      </div>
      {formData.components && !formData.componentFlags && <p className="text-xs text-muted-foreground">{t("legacy", { text: formData.components })}</p>}
      {c.flags.m && (
        <div className="mt-2 space-y-3">
          {c.ingredients.map((ingredient, i) => (
            <IngredientRow key={i} index={i} ingredient={ingredient} duplicate={c.duplicates.has(i)} onChange={(patch) => c.update(i, patch)} onRemove={() => c.remove(i)} />
          ))}
          {c.canAdd && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" className="min-h-11" onClick={c.add}>
                {t("add")}
              </Button>
              <SelectField aria-label={t("preset")} value="" onValueChange={(id) => c.addPreset(id as IngredientPresetId)} placeholder={t("preset")} options={INGREDIENT_PRESETS.map((p) => ({ value: p.id, label: t(`presets.${p.id}`) }))} />
            </div>
          )}
          {c.summary && <p className="text-sm">{t("required", { list: c.summary })}</p>}
        </div>
      )}
    </HudSection>
  );
}
