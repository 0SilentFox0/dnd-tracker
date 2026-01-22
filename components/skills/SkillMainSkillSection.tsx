"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
        <Select
          value={mainSkillId || "none"}
          onValueChange={(value) =>
            setters.setMainSkillId(value === "none" ? null : value)
          }
        >
          <SelectTrigger id="skill-main-skill">
            <SelectValue placeholder="Без основного навику" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Без основного навику</SelectItem>
            {mainSkills.map((mainSkill) => (
              <SelectItem key={mainSkill.id} value={mainSkill.id}>
                {mainSkill.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
