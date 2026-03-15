"use client";

import { Label } from "@/components/ui/label";

interface SpellSlotsSectionProps {
  spellSlots: Record<string, { max: number; current: number }>;
}

export function SpellSlotsSection({ spellSlots }: SpellSlotsSectionProps) {
  const entries = Object.entries(spellSlots).sort(([a], [b]) =>
    a === "universal" ? -1 : b === "universal" ? 1 : Number(a) - Number(b),
  );

  return (
    <div>
      <Label>Магічні слоти</Label>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {entries.map(([level, slot]) => {
          const x = level === "universal" ? "У" : level;

          const filled = "●".repeat(slot.current);

          const empty = "○".repeat(Math.max(0, slot.max - slot.current));

          const levelLabel =
            level === "universal" ? "Універсальні" : `Рівень ${level}`;

          return (
            <span
              key={level}
              className="tabular-nums"
              title={`${levelLabel}: ${slot.current}/${slot.max} доступних`}
              aria-label={`${levelLabel}: ${slot.current} з ${slot.max}`}
            >
              {x}({filled}
              {empty})
            </span>
          );
        })}
      </div>
    </div>
  );
}
