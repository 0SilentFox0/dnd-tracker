"use client";

import { ColorField } from "@/components/common/ColorField";
import { IconUrlField } from "@/components/common/IconUrlField";
import { HudSection } from "@/components/hud/form";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/labeled-input";
import { SelectField } from "@/components/ui/select-field";
import { MAIN_SKILL_NAME_MAX, MAIN_SKILL_ROLE_LABELS, MAIN_SKILL_ROLES } from "@/lib/constants/main-skills";
import type { IdName } from "@/types/common";
import type { MainSkillFormData } from "@/types/main-skills";

interface MainSkillFormFieldsProps {
  form: MainSkillFormData;
  onChange: (patch: Partial<MainSkillFormData>) => void;
  spellGroups: IdName[];
}

export function MainSkillFormFields({ form, onChange, spellGroups }: MainSkillFormFieldsProps) {
  return (
    <HudSection title="Основний навик" className="space-y-4">
      <FormField label="Назва" htmlFor="name" required>
        <Input id="name" value={form.name} onChange={(e) => onChange({ name: e.target.value })} required maxLength={MAIN_SKILL_NAME_MAX} placeholder="Наприклад: Напад, Захист, Магія" />
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
      <FormField label="Роль" htmlFor="role" description="Магія — рахується як магічна школа в балансі; Персональні — гілка особистих скілів героя">
        <SelectField
          id="role"
          value={form.role ?? ""}
          onValueChange={(v) => onChange({ role: (v || null) as MainSkillFormData["role"] })}
          options={MAIN_SKILL_ROLES.map((r) => ({ value: r, label: MAIN_SKILL_ROLE_LABELS[r] }))}
          placeholder="Без ролі"
          allowNone
          noneLabel="Без ролі"
          triggerClassName="w-full"
        />
      </FormField>
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
