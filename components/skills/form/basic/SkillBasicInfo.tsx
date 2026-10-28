"use client";

import { IconUrlField } from "@/components/common/IconUrlField";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { Textarea } from "@/components/ui/textarea";
import type { SkillFormBinding } from "@/types/skills";

export function SkillBasicInfo({ form }: { form: SkillFormBinding }) {
  const { data, set } = form;

  return (
    <div className="space-y-3">
      <LabeledInput
        id="skill-name"
        label="Назва"
        value={data.name}
        onChange={(e) => set("name", e.target.value)}
        placeholder="Наприклад: Майстерність з мечем"
        required
      />

      <div className="space-y-2">
        <Label htmlFor="skill-description">Опис</Label>
        <Textarea
          id="skill-description"
          value={data.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Опис скіла"
          rows={3}
        />
      </div>

      <IconUrlField id="skill-icon" label="Іконка (URL)" value={data.icon} onChange={(icon) => set("icon", icon)} fallbackText={data.name} />
    </div>
  );
}
