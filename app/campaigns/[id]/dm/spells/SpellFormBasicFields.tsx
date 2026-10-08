"use client";

import { SPELL_COST_OPTIONS, SPELL_LEVEL_OPTIONS, type SpellFormData } from "./spell-form-defaults";

import { IconUrlField } from "@/components/common/IconUrlField";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import type { SpellCost } from "@/types/spells";

export interface SpellFormFieldsProps {
  formData: SpellFormData;
  setFormData: (data: SpellFormData) => void;
}

export function SpellFormBasicFields({ formData, setFormData, spellGroups }: SpellFormFieldsProps & { spellGroups: { id: string; name: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 [&>*]:min-w-0">
      <LabeledInput containerClassName="col-span-2" id="name" label="Назва заклинання" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="Назва заклинання" />
      <div>
        <Label htmlFor="level">Рівень (слот) *</Label>
        <SelectField id="level" value={String(formData.level)} onValueChange={(value) => setFormData({ ...formData, level: parseInt(value) })} placeholder="Виберіть рівень" options={SPELL_LEVEL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
      </div>
      <div>
        <Label htmlFor="cost">Вартість</Label>
        <SelectField id="cost" value={formData.cost} onValueChange={(value) => setFormData({ ...formData, cost: value as SpellCost })} placeholder="Вартість" options={SPELL_COST_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
      </div>
      <div className="col-span-2">
        <Label htmlFor="groupId">Школа</Label>
        <SelectField id="groupId" value={formData.groupId ?? ""} onValueChange={(value) => setFormData({ ...formData, groupId: value || null })} placeholder="Виберіть школу" options={spellGroups.map((g) => ({ value: g.id, label: g.name }))} allowNone noneLabel="Без школи" />
      </div>
      <div className="col-span-2">
        <Label htmlFor="description">Що робить (точна механіка)</Label>
        <Textarea id="description" value={formData.description ?? ""} onChange={(e) => setFormData({ ...formData, description: e.target.value || null })} placeholder="Живою мовою, з числами" rows={3} />
      </div>
      <div className="col-span-2">
        <Label htmlFor="appearanceDescription">Як це виглядає</Label>
        <Textarea id="appearanceDescription" value={formData.appearanceDescription ?? ""} onChange={(e) => setFormData({ ...formData, appearanceDescription: e.target.value || null })} placeholder="Атмосферний опис, 2–4 речення" rows={3} />
      </div>
      <div className="col-span-2">
        <IconUrlField id="icon" label="Посилання на картинку" value={formData.icon ?? ""} onChange={(icon) => setFormData({ ...formData, icon: icon || null })} fallbackText={formData.name} />
      </div>
    </div>
  );
}
