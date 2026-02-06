"use client";

import { LabeledInput } from "@/components/ui/labeled-input";

export interface SkillEffectsTargetingProps {
  minTargets: string;
  maxTargets: string;
  onMinTargetsChange: (value: string) => void;
  onMaxTargetsChange: (value: string) => void;
}

export function SkillEffectsTargeting({
  minTargets,
  maxTargets,
  onMinTargetsChange,
  onMaxTargetsChange,
}: SkillEffectsTargetingProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <LabeledInput
        id="skill-min-targets"
        label="Мін. цілей"
        type="number"
        value={minTargets}
        onChange={(e) => onMinTargetsChange(e.target.value)}
        placeholder="0"
      />
      <LabeledInput
        id="skill-max-targets"
        label="Макс. цілей"
        type="number"
        value={maxTargets}
        onChange={(e) => onMaxTargetsChange(e.target.value)}
        placeholder="0"
      />
    </div>
  );
}
