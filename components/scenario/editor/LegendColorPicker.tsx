"use client";

import type { LegendEntry, LegendKind } from "@/types/scenario";

// hex twins of the dark book palette, the starting colour for entries saved before free colours
const KIND_HEX: Record<LegendKind, string> = {
  read: "#d4706a", choice: "#a9aed8", token: "#79b8a4", artifact: "#d3b060", shadow: "#b79bd6", check: "#ada192", notes: "#4a433b",
};

export function LegendColorPicker({ entry, onChange }: { entry: LegendEntry; onChange: (color: string) => void }) {
  const color = entry.color ?? KIND_HEX[entry.kind];

  return (
    <label
      title="Обрати колір"
      className="relative size-9 shrink-0 cursor-pointer rounded-md border border-input focus-within:ring-2 focus-within:ring-ring"
      style={{ background: color }}
    >
      <input type="color" aria-label="Колір позначки" value={color} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" />
    </label>
  );
}
