"use client";

import { formatTrigger } from "./skillCardFormatters";

import { Badge } from "@/components/ui/badge";
import type { SkillTrigger } from "@/types/skill-triggers";

export function SkillCardTriggersList({
  triggers,
}: {
  triggers: SkillTrigger[];
}) {
  if (triggers.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-muted-foreground">
        Тригери:
      </span>
      <div className="flex flex-wrap gap-1">
        {triggers.map((t, i) => (
          <Badge
            key={i}
            variant="outline"
            className="text-xs font-normal"
          >
            {formatTrigger(t)}
          </Badge>
        ))}
      </div>
    </div>
  );
}
