"use client";

import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { type MapTerrainTool, MAX_BARRIER_ROUNDS, type TerrainBrush } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";

const BRUSHES: { value: TerrainBrush; label: string }[] = [
  { value: "wall", label: "Непрохідне" },
  { value: "barrier", label: "Барʼєр" },
  { value: "hazard", label: "Небезпека" },
  { value: "erase", label: "Стерти" },
];

export function MapTerrainToolbar({ tool }: { tool: MapTerrainTool }) {
  return (
    <div className="flex max-w-[calc(100%-1rem)] flex-wrap items-center gap-1.5 rounded-md border border-hud-rule bg-black/70 p-1.5 text-xs">
      {BRUSHES.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={tool.brush === value}
          onClick={() => tool.setBrush(value)}
          className={cn(
            "h-7 rounded-md border bg-black/60 px-2 hover:bg-black/80",
            tool.brush === value ? "border-[var(--gold)] text-hud-gold-bright" : "border-hud-rule text-hud-muted",
          )}
        >
          {label}
        </button>
      ))}
      {tool.brush === "barrier" && (
        <label className="flex items-center gap-1 text-hud-muted">
          Раундів
          <NumberInput
            aria-label="Раундів"
            className="h-7 w-14 px-2 text-xs"
            min={1}
            max={MAX_BARRIER_ROUNDS}
            value={tool.rounds}
            onChange={(v) => tool.setRounds(Math.min(MAX_BARRIER_ROUNDS, Math.max(1, v ?? 1)))}
          />
        </label>
      )}
      {tool.brush === "hazard" && (
        <Input aria-label="Підпис небезпеки" className="h-7 w-40 px-2 text-xs" maxLength={60} value={tool.label} onChange={(e) => tool.setLabel(e.target.value)} />
      )}
    </div>
  );
}
