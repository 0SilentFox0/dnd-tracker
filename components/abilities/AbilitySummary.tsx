"use client";

import { useAbilityText } from "./use-ability-text";

import type { AbilityFlowSummary } from "@/lib/utils/abilities/segments";

export function AbilitySummary({ lines }: { lines: AbilityFlowSummary[] }) {
  const items = useAbilityText().flows(lines);

  if (!items.length) return <p className="text-xs text-muted-foreground">—</p>;

  return (
    <ul className="space-y-0.5 text-xs">
      {items.map((line, i) => (
        <li key={i}>{line}</li>
      ))}
    </ul>
  );
}
