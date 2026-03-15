"use client";

/** Магічні слоти: рівень → { max, current } */
export type SpellSlotsData = Record<string, { max: number; current: number }>;

export interface SpellSlotsBadgeProps {
  spellSlots: SpellSlotsData;
}

export function SpellSlotsBadge({ spellSlots }: SpellSlotsBadgeProps) {
  if (!spellSlots || Object.keys(spellSlots).length === 0) {
    return null;
  }

  return (
    <div
      className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md border border-amber-500/50 bg-amber-950/90 px-2 py-1 text-[10px] text-amber-200/90 tabular-nums"
      title="Магічні слоти: рівень(● доступні, ○ використані)"
    >
      {Object.entries(spellSlots)
        .filter(([k]) => k !== "universal" && spellSlots[k].max > 0)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([level, slot]) => {
          const filled = "●".repeat(slot.current);

          const empty = "○".repeat(Math.max(0, slot.max - slot.current));

          return (
            <span key={level} className="font-medium text-amber-200/90">
              {level}({filled}{empty})
            </span>
          );
        })}
      {spellSlots.universal && (
        <span
          key="universal"
          className="border-l border-amber-500/40 pl-1.5 font-medium text-amber-200/90"
        >
          У(
          {"●".repeat(spellSlots.universal.current)}
          {"○".repeat(Math.max(0, spellSlots.universal.max - spellSlots.universal.current))}
          )
        </span>
      )}
    </div>
  );
}
