"use client";

import { ColorField } from "@/components/common/ColorField";
import { IconUrlField } from "@/components/common/IconUrlField";
import { HudSection } from "@/components/hud/form";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/labeled-input";
import { SelectField } from "@/components/ui/select-field";
import type { MainSkillFormData } from "@/types/main-skills";

interface MainSkillFormFieldsProps {
  form: MainSkillFormData;
  onChange: (patch: Partial<MainSkillFormData>) => void;
  spellGroups: { id: string; name: string }[];
}

export function MainSkillFormFields({ form, onChange, spellGroups }: MainSkillFormFieldsProps) {
  return (
    <HudSection title="Основний навик" className="space-y-4">
      <FormField label="Назва" htmlFor="name" required>
        <Input id="name" value={form.name} onChange={(e) => onChange({ name: e.target.value })} required placeholder="Наприклад: Напад, Захист, Магія" />
      </FormField>
      <ColorField
        id="color"
        label="Колір сегменту"
        required
        value={form.color}
        onChange={(color) => onChange({ color })}
        description="Колір використовується для відображення сегменту в дереві прокачки"
      />
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
    </HudSection>
  );
}
