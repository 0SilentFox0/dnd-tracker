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
      className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md border border-amber-500/50 bg-amber-950/90 px-2 py-1 text-[10px] text-amber-200/90"
      title="Магічні слоти за рівнями"
    >
      {Object.entries(spellSlots)
        .filter(([k]) => k !== "universal" && spellSlots[k].max > 0)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([level, slot]) => (
          <span key={level} className="flex items-center gap-0.5">
            <span className="font-bold text-amber-400/90">Рів.{level}</span>
            <span>{slot.max}</span>
          </span>
        ))}
      {spellSlots.universal && (
        <span
          key="universal"
          className="flex items-center gap-0.5 border-l border-amber-500/40 pl-1.5"
        >
          <span className="font-bold text-amber-400/90">Унів.</span>
          <span>{spellSlots.universal.max}</span>
        </span>
      )}
    </div>
  );
}
