"use client";

import { useTranslations } from "next-intl";

import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import type { IdName } from "@/types/common";
import type { SkillFormBinding } from "@/types/skills";

export function SkillMainSkillSection({ form, mainSkills }: { form: SkillFormBinding; mainSkills: IdName[] }) {
  const t = useTranslations("skills.form.mainSkill");

  const { data, set } = form;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="skill-main-skill">{t("label")}</Label>
        <SelectField
          id="skill-main-skill"
          value={data.mainSkillId || ""}
          onValueChange={(value) => set("mainSkillId", value || null)}
          placeholder={t("none")}
          options={mainSkills.map((skill) => ({ value: skill.id, label: skill.name }))}
          allowNone
          noneLabel={t("none")}
        />
      </div>
    </div>
  );
}
