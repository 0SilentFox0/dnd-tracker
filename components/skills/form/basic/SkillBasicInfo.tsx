"use client";

import { IconUrlField } from "@/components/common/IconUrlField";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { Textarea } from "@/components/ui/textarea";

interface SkillBasicInfoProps {
  basicInfo: {
    name: string;
    description: string;
    icon: string;
    setters: {
      setName: (value: string) => void;
      setDescription: (value: string) => void;
      setIcon: (value: string) => void;
    };
  };
}

export function SkillBasicInfo({
  basicInfo,
}: SkillBasicInfoProps) {
  const { name, description, icon, setters } = basicInfo;

  return (
    <div className="space-y-3">
      <LabeledInput
        id="skill-name"
        label="Назва"
        value={name}
        onChange={(e) => setters.setName(e.target.value)}
        placeholder="Наприклад: Майстерність з мечем"
        required
      />

      <div className="space-y-2">
        <Label htmlFor="skill-description">Опис</Label>
        <Textarea
          id="skill-description"
          value={description}
          onChange={(e) => setters.setDescription(e.target.value)}
          placeholder="Опис скіла"
          rows={3}
        />
      </div>

      <IconUrlField id="skill-icon" label="Іконка (URL)" value={icon} onChange={setters.setIcon} fallbackText={name} />
    </div>
  );
}
