"use client";

import { LEGEND_SWATCH } from "@/components/scenario/ScenarioLegend";
import { LEGEND_KINDS } from "@/lib/constants/scenario";
import { cn } from "@/lib/utils";
import type { LegendKind } from "@/types/scenario";

const COLOR_NAMES: Record<LegendKind, string> = {
  read: "Червоний", choice: "Синій", token: "Зелений", artifact: "Золотий", shadow: "Фіолетовий", check: "Сірий", notes: "Світлий",
};

export function LegendColorPicker({ value, onChange }: { value: LegendKind; onChange: (kind: LegendKind) => void }) {
  return (
    <div role="radiogroup" aria-label="Колір позначки" className="scenario-palette flex shrink-0 flex-wrap items-center gap-1.5">
      {LEGEND_KINDS.map((kind) => (
        <button
          key={kind}
          type="button"
          role="radio"
          aria-checked={kind === value}
          aria-label={COLOR_NAMES[kind]}
          title={COLOR_NAMES[kind]}
          onClick={() => onChange(kind)}
          style={LEGEND_SWATCH[kind]}
          className={cn("size-5 rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", kind === value && "ring-2 ring-primary ring-offset-2 ring-offset-background")}
        />
      ))}
    </div>
  );
}
