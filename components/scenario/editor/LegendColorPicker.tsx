"use client";

import { ColorSwatch } from "@/components/common/ColorSwatch";
import type { LegendEntry, LegendKind } from "@/types/scenario";

// hex twins of the dark book palette, the starting colour for entries saved before free colours
const KIND_HEX: Record<LegendKind, string> = {
  read: "#d4706a", choice: "#a9aed8", token: "#79b8a4", artifact: "#d3b060", shadow: "#b79bd6", check: "#ada192", notes: "#4a433b",
};

export function LegendColorPicker({ entry, onChange }: { entry: LegendEntry; onChange: (color: string) => void }) {
  return <ColorSwatch color={entry.color ?? KIND_HEX[entry.kind]} label="Колір позначки" onChange={onChange} />;
}
