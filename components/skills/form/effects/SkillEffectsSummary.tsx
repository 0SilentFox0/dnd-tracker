"use client";

import {
  getStatLabel,
  getTypeLabel,
  isFlagValueType,
} from "@/lib/constants/skill-effects";
import type { SkillEffect } from "@/types/battle";

export interface SkillEffectsSummaryProps {
  effects: SkillEffect[];
}

function formatEffectValue(e: SkillEffect): string {
  if (isFlagValueType(e.type)) return "✓";

  if (e.type === "percent") return `${e.value}%`;

  return String(e.value);
}

export function SkillEffectsSummary({ effects }: SkillEffectsSummaryProps) {
  if (effects.length === 0) return null;

  return (
    <div className="rounded bg-muted/50 p-2">
      <p className="text-xs text-muted-foreground font-medium mb-1">
        Підсумок:
      </p>
      <div className="flex flex-wrap gap-1">
        {effects.map((effect, i) => (
          <span
            key={i}
            className="inline-flex items-center rounded bg-background px-2 py-0.5 text-xs border"
          >
            {getStatLabel(effect.stat)}: {getTypeLabel(effect.type)}{" "}
            {formatEffectValue(effect)}
            {effect.duration ? ` (${effect.duration} р.)` : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
