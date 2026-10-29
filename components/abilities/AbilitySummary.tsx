"use client";

import { useAbilityText } from "./use-ability-text";

import type { Segment } from "@/lib/utils/abilities/segments";

export function AbilitySummary({ lines }: { lines: Segment[][] }) {
  const items = useAbilityText().lines(lines);

  if (!items.length) return <p className="text-xs text-muted-foreground">—</p>;

  return (
    <ul className="space-y-0.5 text-xs">
      {items.map((line, i) => (
        <li key={i}>{line}</li>
      ))}
    </ul>
  );
}
