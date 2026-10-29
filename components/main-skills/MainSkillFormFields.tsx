"use client";

import { useTranslations } from "next-intl";

import { ColorField } from "@/components/common/ColorField";
import { IconUrlField } from "@/components/common/IconUrlField";
import { HudSection } from "@/components/hud/form";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/labeled-input";
import { SelectField } from "@/components/ui/select-field";
import { MAIN_SKILL_NAME_MAX, MAIN_SKILL_ROLES } from "@/lib/constants/main-skills";
import type { IdName } from "@/types/common";
import type { MainSkillFormData } from "@/types/main-skills";

interface MainSkillFormFieldsProps {
  form: MainSkillFormData;
  onChange: (patch: Partial<MainSkillFormData>) => void;
  spellGroups: IdName[];
}

export function MainSkillFormFields({ form, onChange, spellGroups }: MainSkillFormFieldsProps) {
  const t = useTranslations("skills.mainSkills");

  return (
    <HudSection title={t("form.section")} className="space-y-4">
      <FormField label={t("form.name")} htmlFor="name" required>
        <Input id="name" value={form.name} onChange={(e) => onChange({ name: e.target.value })} required maxLength={MAIN_SKILL_NAME_MAX} placeholder={t("form.namePlaceholder")} />
      </FormField>
      <ColorField
        id="color"
        label={t("form.color")}
        required
        value={form.color}
        onChange={(color) => onChange({ color })}
        description={t("form.colorDescription")}
      />
      <IconUrlField id="icon" label={t("form.icon")} value={form.icon ?? ""} onChange={(icon) => onChange({ icon })} fallbackText={form.name} />
      <FormField label={t("form.role")} htmlFor="role" description={t("form.roleDescription")}>
        <SelectField
          id="role"
          value={form.role ?? ""}
          onValueChange={(v) => onChange({ role: (v || null) as MainSkillFormData["role"] })}
          options={MAIN_SKILL_ROLES.map((r) => ({ value: r, label: t(`roles.${r}`) }))}
          placeholder={t("form.roleNone")}
          allowNone
          noneLabel={t("form.roleNone")}
          triggerClassName="w-full"
        />
      </FormField>
      {spellGroups.length > 0 && (
        <FormField label={t("form.spellGroup")} htmlFor="spellGroupId" description={t("form.spellGroupDescription")}>
          <SelectField
            id="spellGroupId"
            value={form.spellGroupId ?? ""}
            onValueChange={(v) => onChange({ spellGroupId: v || null })}
            options={spellGroups.map((g) => ({ value: g.id, label: g.name }))}
            placeholder={t("form.spellGroupPlaceholder")}
            allowNone
            noneLabel={t("form.spellGroupNone")}
            triggerClassName="w-full"
          />
        </FormField>
      )}
    </HudSection>
  );
}
