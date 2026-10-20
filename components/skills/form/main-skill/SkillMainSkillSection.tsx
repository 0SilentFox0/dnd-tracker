"use client";

import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import type { IdName } from "@/types/common";
import type { SkillFormBinding } from "@/types/skills";

export function SkillMainSkillSection({ form, mainSkills }: { form: SkillFormBinding; mainSkills: IdName[] }) {
  const { data, set } = form;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="skill-main-skill">Основний навик</Label>
        <SelectField
          id="skill-main-skill"
          value={data.mainSkillId || ""}
          onValueChange={(value) => set("mainSkillId", value || null)}
          placeholder="Без основного навику"
          options={mainSkills.map((skill) => ({ value: skill.id, label: skill.name }))}
          allowNone
          noneLabel="Без основного навику"
        />
      </div>
    </div>
  );
}
