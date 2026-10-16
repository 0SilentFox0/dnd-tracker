"use client";

import { SAVE_ABILITY_OPTIONS, SAVE_ON_SUCCESS_OPTIONS, TARGETING_KIND_OPTIONS } from "./spell-form-defaults";
import type { SpellFormFieldsProps } from "./SpellFormBasicFields";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import type { AbilityKey } from "@/lib/constants/abilities";
import type { SpellTargeting } from "@/types/spells";

function targetingOf(kind: string, previous: SpellTargeting): SpellTargeting {
  if (kind === "area") return { kind, side: previous.kind === "area" ? previous.side : "enemy", maxTargets: previous.kind === "area" ? previous.maxTargets : 3 };

  return { kind } as SpellTargeting;
}

export function SpellFormPowerFields({ formData, setFormData }: SpellFormFieldsProps) {
  const { targeting, resolution } = formData;

  return (
    <div className="grid grid-cols-2 gap-4 [&>*]:min-w-0">
      <div className="col-span-2">
        <Label htmlFor="dice">Базові кубики N</Label>
        <Input id="dice" type="number" min={0} max={20} value={formData.dice} onChange={(e) => setFormData({ ...formData, dice: Math.max(0, Math.min(20, parseInt(e.target.value) || 0)) })} className="w-24" />
        <p className="mt-1 text-xs text-muted-foreground">Кидається (N + ⌊рівень героя / 3⌋) кубиків; грані — від майстерності школи (к6 / к8 / к10); 0 — без кубиків.</p>
      </div>
      <div className={targeting.kind === "area" ? "" : "col-span-2"}>
        <Label htmlFor="targeting">Цілі</Label>
        <SelectField id="targeting" value={targeting.kind} onValueChange={(kind) => setFormData({ ...formData, targeting: targetingOf(kind, targeting) })} placeholder="Цілі" options={TARGETING_KIND_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
      </div>
      {targeting.kind === "area" && (
        <>
          <div>
            <Label htmlFor="targeting-side">Сторона</Label>
            <SelectField id="targeting-side" value={targeting.side} onValueChange={(side) => setFormData({ ...formData, targeting: { ...targeting, side: side as "ally" | "enemy" } })} placeholder="Сторона" options={[{ value: "enemy", label: "Вороги" }, { value: "ally", label: "Союзники" }]} />
          </div>
          <div>
            <Label htmlFor="targeting-max">Макс. цілей</Label>
            <Input id="targeting-max" type="number" min={1} max={20} value={targeting.maxTargets} onChange={(e) => setFormData({ ...formData, targeting: { ...targeting, maxTargets: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)) } })} className="w-24" />
          </div>
        </>
      )}
      <div className="col-span-2">
        <Label htmlFor="resolution">Перевірка</Label>
        <SelectField id="resolution" value={resolution.kind} onValueChange={(kind) => setFormData({ ...formData, resolution: kind === "save" ? { kind, ability: "dexterity", onSuccess: "half" } : { kind: "auto" } })} placeholder="Перевірка" options={[{ value: "auto", label: "Автоматично" }, { value: "save", label: "Рятівний кидок цілі" }]} />
      </div>
      {resolution.kind === "save" && (
        <>
          <div>
            <Label htmlFor="save-ability">Характеристика (DC = 8 + майстерність + мод. заклинателя)</Label>
            <SelectField id="save-ability" value={resolution.ability} onValueChange={(ability) => setFormData({ ...formData, resolution: { ...resolution, ability: ability as AbilityKey } })} placeholder="Характеристика" options={SAVE_ABILITY_OPTIONS} />
          </div>
          <div>
            <Label htmlFor="save-on-success">При успіху</Label>
            <SelectField id="save-on-success" value={resolution.onSuccess} onValueChange={(onSuccess) => setFormData({ ...formData, resolution: { ...resolution, onSuccess: onSuccess as "half" | "none" } })} placeholder="При успіху" options={SAVE_ON_SUCCESS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
          </div>
        </>
      )}
    </div>
  );
}
