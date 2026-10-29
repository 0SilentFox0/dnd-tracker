"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import type { SpellFormFieldsProps } from "./SpellFormBasicFields";

import { AbilityEditorProvider } from "@/components/abilities/editor-context";
import { HudSection } from "@/components/hud/form";
import { SpellEffectCard } from "@/components/spells/form/effects/SpellEffectCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import type { ErrorParams } from "@/lib/constants/api-errors";
import { useRaces } from "@/lib/hooks/races";
import { type AbilityError, allowedEffectKinds, newEffect } from "@/lib/utils/abilities/editor";
import { SPELL_EFFECT_TRIGGER } from "@/lib/utils/spells/editor/spell-only";
import { type SpellEffect, SpellEffectSchema } from "@/lib/utils/spells/model/schema";

function bounds(issue: object): ErrorParams {
  const { minimum, maximum } = issue as { minimum?: unknown; maximum?: unknown };

  const out: ErrorParams = {};

  if (typeof minimum === "number") out.minimum = minimum;

  if (typeof maximum === "number") out.maximum = maximum;

  return out;
}

export function SpellFormEffects({ campaignId, formData, setFormData }: SpellFormFieldsProps & { campaignId: string }) {
  const t = useTranslations("spellEditor.effects");

  const { data: races = [] } = useRaces(campaignId);

  const errorsByPath: Record<string, AbilityError[]> = {};

  formData.spellEffects.forEach((effect, i) => {
    const parsed = SpellEffectSchema.safeParse(effect);

    if (parsed.success) return;

    for (const issue of parsed.error.issues) (errorsByPath[["effects", i, ...issue.path].join(".")] ??= []).push({ message: issue.message, params: { ...(issue as { params?: ErrorParams }).params, ...bounds(issue) } });
  });

  return (
    <>
      <HudSection title={t("title")}>
        <p className="mb-2 text-xs text-muted-foreground">
          {t("hint")}
        </p>
        <AbilityEditorProvider value={{ campaignId, errorsByPath }}>
          <div className="space-y-2">
            {formData.spellEffects.map((effect, i) => (
              <SpellEffectCard
                key={i}
                effect={effect as SpellEffect}
                path={`effects.${i}`}
                actions={{
                  onChange: (next) => setFormData({ ...formData, spellEffects: formData.spellEffects.map((x, j) => (j === i ? next : x)) }),
                  onRemove: () => setFormData({ ...formData, spellEffects: formData.spellEffects.filter((_, j) => j !== i) }),
                }}
              />
            ))}
          </div>
        </AbilityEditorProvider>
        <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => setFormData({ ...formData, spellEffects: [...formData.spellEffects, newEffect(allowedEffectKinds(SPELL_EFFECT_TRIGGER)[0], SPELL_EFFECT_TRIGGER)] })}>
          {t("add")}
        </Button>
      </HudSection>

      <HudSection title={t("concentrationTitle")}>
        <div className="flex items-center gap-3">
          <Checkbox id="spell-concentration" checked={!!formData.concentration} onCheckedChange={(checked) => setFormData({ ...formData, concentration: checked === true })} />
          <Label htmlFor="spell-concentration" className="cursor-pointer font-medium">
            {t("concentration")}
          </Label>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t("concentrationHint")}</p>
      </HudSection>

      <HudSection title={t("stackingTitle")}>
        <div className="flex items-center gap-3">
          <Checkbox id="spell-stackable" checked={formData.stackable} onCheckedChange={(checked) => setFormData({ ...formData, stackable: checked === true, maxStacks: checked === true ? (formData.maxStacks ?? 3) : null })} />
          <Label htmlFor="spell-stackable" className="cursor-pointer font-medium">
            {t("stackable")}
          </Label>
          {formData.stackable && (
            <Input aria-label={t("maxStacks")} type="number" min={1} max={10} value={formData.maxStacks ?? 3} onChange={(e) => setFormData({ ...formData, maxStacks: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) })} className="w-20" />
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t("stackingHint")}</p>
      </HudSection>

      <HudSection title={t("raceTitle")}>
        <p className="mb-2 text-xs text-muted-foreground">{t("raceHint")}</p>
        <ul className="space-y-2">
          {formData.raceModifiers.map((m, i) => (
            <li key={i} className="flex items-center gap-2">
              <SelectField
                value={m.raceId}
                onValueChange={(raceId) => setFormData({ ...formData, raceModifiers: formData.raceModifiers.map((x, j) => (j === i ? { ...x, raceId } : x)) })}
                placeholder={t("racePlaceholder")}
                options={races.map((r) => ({ value: r.id, label: r.name }))}
                triggerClassName="flex-1"
              />
              <Input
                aria-label={t("percent")}
                type="number"
                min={-100}
                max={200}
                value={m.percent}
                onChange={(e) => setFormData({ ...formData, raceModifiers: formData.raceModifiers.map((x, j) => (j === i ? { ...x, percent: Math.max(-100, Math.min(200, parseInt(e.target.value) || 0)) } : x)) })}
                className="w-24"
              />
              <Button type="button" variant="ghost" size="icon" aria-label={t("remove")} onClick={() => setFormData({ ...formData, raceModifiers: formData.raceModifiers.filter((_, j) => j !== i) })}>
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
        <Button type="button" size="sm" variant="outline" className="mt-2" disabled={races.length === 0} onClick={() => setFormData({ ...formData, raceModifiers: [...formData.raceModifiers, { raceId: races[0]?.id ?? "", percent: -100 }] })}>
          {t("addRace")}
        </Button>
      </HudSection>
    </>
  );
}
