"use client";

import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";

interface MainSkill {
  id: string;
  name: string;
}

interface SkillMainSkillSectionProps {
  mainSkill: {
    mainSkillId: string | null;
    setters: {
      setMainSkillId: (value: string | null) => void;
    };
  };
  mainSkills: MainSkill[];
}

export function SkillMainSkillSection({
  mainSkill,
  mainSkills,
}: SkillMainSkillSectionProps) {
  const { mainSkillId, setters } = mainSkill;

  return (
    <div className="rounded-md border p-4 space-y-3">
      <div className="space-y-2">
        <Label htmlFor="skill-main-skill">Основний навик</Label>
        <SelectField
          id="skill-main-skill"
          value={mainSkillId || ""}
          onValueChange={(value) => setters.setMainSkillId(value || null)}
          placeholder="Без основного навику"
          options={mainSkills.map(skill => ({ value: skill.id, label: skill.name }))}
          allowNone
          noneLabel="Без основного навику"
        />
      </div>
    </div>
  );
}
