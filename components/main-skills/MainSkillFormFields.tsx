"use client";

import { FormField } from "@/components/common/FormField";
import { IconUrlField } from "@/components/common/IconUrlField";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import type { MainSkillFormData } from "@/types/main-skills";

interface MainSkillFormFieldsProps {
  form: MainSkillFormData;
  onChange: (patch: Partial<MainSkillFormData>) => void;
  spellGroups: { id: string; name: string }[];
}

export function MainSkillFormFields({ form, onChange, spellGroups }: MainSkillFormFieldsProps) {
  return (
    <>
      <FormField label="Назва" htmlFor="name" required>
        <Input id="name" value={form.name} onChange={(e) => onChange({ name: e.target.value })} required placeholder="Наприклад: Напад, Захист, Магія" />
      </FormField>
      <FormField label="Колір сегменту" htmlFor="color" required description="Колір використовується для відображення сегменту в дереві прокачки">
        <div className="flex items-center gap-2">
          <Input id="color" type="color" value={form.color} onChange={(e) => onChange({ color: e.target.value })} className="h-10 w-20" />
          <Input aria-label="Колір (hex)" type="text" value={form.color} onChange={(e) => onChange({ color: e.target.value })} placeholder="#000000" className="flex-1" />
        </div>
      </FormField>
      <IconUrlField id="icon" label="Іконка (URL)" value={form.icon ?? ""} onChange={(icon) => onChange({ icon })} fallbackText={form.name} />
      {spellGroups.length > 0 && (
        <FormField label="Група заклинань (школа магії)" htmlFor="spellGroupId" description="При вивченні рівня цієї навички герой отримає заклинання обраної групи">
          <SelectField
            id="spellGroupId"
            value={form.spellGroupId ?? ""}
            onValueChange={(v) => onChange({ spellGroupId: v || null })}
            options={spellGroups.map((g) => ({ value: g.id, label: g.name }))}
            placeholder="Оберіть групу заклинань"
            allowNone
            noneLabel="— Без групи —"
            triggerClassName="w-full"
          />
        </FormField>
      )}
    </>
  );
}
