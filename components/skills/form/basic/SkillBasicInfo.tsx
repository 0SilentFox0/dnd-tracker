"use client";

import { useTranslations } from "next-intl";

import { IconUrlField } from "@/components/common/IconUrlField";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { Textarea } from "@/components/ui/textarea";
import { SKILL_NAME_MAX } from "@/lib/constants/skills";
import type { SkillFormBinding } from "@/types/skills";

export function SkillBasicInfo({ form }: { form: SkillFormBinding }) {
  const t = useTranslations("skills.form.basic");

  const { data, set } = form;

  return (
    <div className="space-y-3">
      <LabeledInput
        id="skill-name"
        label={t("name")}
        value={data.name}
        onChange={(e) => set("name", e.target.value)}
        placeholder={t("namePlaceholder")}
        required
        maxLength={SKILL_NAME_MAX}
      />

      <div className="space-y-2">
        <Label htmlFor="skill-description">{t("description")}</Label>
        <Textarea
          id="skill-description"
          value={data.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder={t("descriptionPlaceholder")}
          rows={3}
        />
      </div>

      <IconUrlField id="skill-icon" label={t("icon")} value={data.icon} onChange={(icon) => set("icon", icon)} fallbackText={data.name} />
    </div>
  );
}
