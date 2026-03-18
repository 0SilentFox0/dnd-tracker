"use client";

import { formatEffectValue } from "./skillCardFormatters";

import { getStatLabel, getTypeLabel } from "@/lib/constants/skill-effects";
import type { SkillEffect } from "@/types/battle";

export function SkillCardEffectsList({ effects }: { effects: SkillEffect[] }) {
  if (effects.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-muted-foreground">
        Ефекти:
      </span>
      <div className="flex flex-wrap gap-1">
        {effects.map((e, i) => (
          <span
            key={i}
            className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs"
          >
            {getStatLabel(e.stat)}: {getTypeLabel(e.type)}{" "}
            {formatEffectValue(e)}
            {e.duration != null ? ` (${e.duration} р.)` : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
