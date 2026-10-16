"use client";

import { X } from "lucide-react";

import type { SpellFormFieldsProps } from "./SpellFormBasicFields";

import { AbilityEditorProvider } from "@/components/abilities/editor-context";
import { EffectCard } from "@/components/abilities/EffectCard";
import { HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { useRaces } from "@/lib/hooks/races";
import { allowedEffectKinds, newEffect } from "@/lib/utils/abilities/editor";
import { EffectSchema, type Trigger } from "@/lib/utils/abilities/schema";

const TRIGGER: Trigger = { event: "action" };

export function SpellFormEffects({ campaignId, formData, setFormData }: SpellFormFieldsProps & { campaignId: string }) {
  const { data: races = [] } = useRaces(campaignId);

  const errorsByPath = Object.fromEntries(
    formData.spellEffects.flatMap((effect, i) => {
      const parsed = EffectSchema.safeParse(effect);

      return parsed.success ? [] : [[`effects.${i}`, parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)]];
    }),
  );

  return (
    <>
      <HudSection title="Ефекти">
        <p className="mb-2 text-xs text-muted-foreground">
          Ефекти діють на цілі заклинання (ціль «ціль події») або на заклинателя (ціль «я»). Кидок заклинання у сумах — «% кидка заклинання».
        </p>
        <AbilityEditorProvider value={{ campaignId, errorsByPath }}>
          <div className="space-y-2">
            {formData.spellEffects.map((effect, i) => (
              <EffectCard
                key={i}
                effect={effect}
                trigger={TRIGGER}
                path={`effects.${i}`}
                actions={{
                  onChange: (next) => setFormData({ ...formData, spellEffects: formData.spellEffects.map((x, j) => (j === i ? next : x)) }),
                  onRemove: () => setFormData({ ...formData, spellEffects: formData.spellEffects.filter((_, j) => j !== i) }),
                }}
              />
            ))}
          </div>
        </AbilityEditorProvider>
        <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => setFormData({ ...formData, spellEffects: [...formData.spellEffects, newEffect(allowedEffectKinds(TRIGGER)[0], TRIGGER)] })}>
          + ефект
        </Button>
      </HudSection>

      <HudSection title="Накладання">
        <div className="flex items-center gap-3">
          <Checkbox id="spell-stackable" checked={formData.stackable} onCheckedChange={(checked) => setFormData({ ...formData, stackable: checked === true, maxStacks: checked === true ? (formData.maxStacks ?? 3) : null })} />
          <Label htmlFor="spell-stackable" className="cursor-pointer font-medium">
            Ефекти складаються при повторному касті
          </Label>
          {formData.stackable && (
            <Input aria-label="Макс. накладань" type="number" min={1} max={10} value={formData.maxStacks ?? 3} onChange={(e) => setFormData({ ...formData, maxStacks: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) })} className="w-20" />
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">На ліміті оновлюється накладання з найменшою тривалістю.</p>
      </HudSection>

      <HudSection title="Расові модифікатори шкоди">
        <p className="mb-2 text-xs text-muted-foreground">−100 % — імунітет раси, +100 % — подвоєна шкода.</p>
        <ul className="space-y-2">
          {formData.raceModifiers.map((m, i) => (
            <li key={i} className="flex items-center gap-2">
              <SelectField
                value={m.raceId}
                onValueChange={(raceId) => setFormData({ ...formData, raceModifiers: formData.raceModifiers.map((x, j) => (j === i ? { ...x, raceId } : x)) })}
                placeholder="Раса"
                options={races.map((r) => ({ value: r.id, label: r.name }))}
                triggerClassName="flex-1"
              />
              <Input
                aria-label="Відсоток"
                type="number"
                min={-100}
                max={200}
                value={m.percent}
                onChange={(e) => setFormData({ ...formData, raceModifiers: formData.raceModifiers.map((x, j) => (j === i ? { ...x, percent: Math.max(-100, Math.min(200, parseInt(e.target.value) || 0)) } : x)) })}
                className="w-24"
              />
              <Button type="button" variant="ghost" size="icon" aria-label="Прибрати" onClick={() => setFormData({ ...formData, raceModifiers: formData.raceModifiers.filter((_, j) => j !== i) })}>
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
        <Button type="button" size="sm" variant="outline" className="mt-2" disabled={races.length === 0} onClick={() => setFormData({ ...formData, raceModifiers: [...formData.raceModifiers, { raceId: races[0]?.id ?? "", percent: -100 }] })}>
          + раса
        </Button>
      </HudSection>
    </>
  );
}
