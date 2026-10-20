"use client";

import { CLEAR_WEATHER_LABEL, WEATHER_KINDS, WEATHER_LABELS } from "@/lib/constants/battle-weather";
import type { MapWeatherTool } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import type { WeatherKind } from "@/types/battle";

const OPTIONS: { value: WeatherKind | null; label: string }[] = [
  { value: null, label: CLEAR_WEATHER_LABEL },
  ...WEATHER_KINDS.map((value) => ({ value, label: WEATHER_LABELS[value] })),
];

export function MapWeatherPicker({ tool }: { tool: MapWeatherTool }) {
  return (
    <div role="group" aria-label="Погода" className="flex max-w-[calc(100%-1rem)] flex-wrap items-center gap-1.5 rounded-md border border-hud-rule bg-black/70 p-1.5 text-xs">
      {OPTIONS.map(({ value, label }) => (
        <button
          key={label}
          type="button"
          aria-pressed={tool.current === value}
          disabled={tool.pending}
          onClick={() => tool.choose(value)}
          className={cn(
            "h-7 rounded border px-2",
            tool.current === value ? "border-[var(--gold)] text-hud-gold-bright" : "border-hud-rule text-hud-muted hover:text-hud-bone",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
