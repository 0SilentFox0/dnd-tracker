import { describeAbility } from "@/lib/utils/abilities/registry/effects";
import type { Ability } from "@/lib/utils/abilities/schema";

export function AbilitySummary({ abilities, lines }: { abilities?: Ability[]; lines?: string[] }) {
  const items = lines ?? (abilities ?? []).map(describeAbility);

  if (!items.length) return <p className="text-xs text-muted-foreground">—</p>;

  return (
    <ul className="space-y-0.5 text-xs">
      {items.map((line, i) => (
        <li key={i}>{line}</li>
      ))}
    </ul>
  );
}
