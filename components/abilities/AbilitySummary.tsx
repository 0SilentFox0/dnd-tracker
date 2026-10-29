"use client";

import { useText } from "@/lib/i18n/use-text";
import { describeAbility } from "@/lib/utils/abilities/registry/effects";
import type { Ability } from "@/lib/utils/abilities/schema";
import type { LogLine } from "@/types/text";

export function AbilitySummary({ abilities, lines }: { abilities?: Ability[]; lines?: LogLine[] }) {
  const text = useText();

  const items = lines ?? (abilities ?? []).map(describeAbility);

  if (!items.length) return <p className="text-xs text-muted-foreground">—</p>;

  return (
    <ul className="space-y-0.5 text-xs">
      {items.map((line, i) => (
        <li key={i}>{text(line)}</li>
      ))}
    </ul>
  );
}
