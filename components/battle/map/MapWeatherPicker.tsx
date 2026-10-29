"use client";

import { useTranslations } from "next-intl";

import { WEATHER_KINDS } from "@/lib/constants/battle-weather";
import type { MapWeatherTool } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import type { WeatherKind } from "@/types/battle";

const OPTIONS: readonly (WeatherKind | null)[] = [null, ...WEATHER_KINDS];

export function MapWeatherPicker({ tool }: { tool: MapWeatherTool }) {
  const t = useTranslations("battle.map");

  const tw = useTranslations("battleCommon.weather");

  return (
    <div role="group" aria-label={t("tools.weather")} className="flex max-w-[calc(100%-1rem)] flex-wrap items-center gap-1.5 rounded-md border border-hud-rule bg-black/70 p-1.5 text-xs">
      {OPTIONS.map((value) => (
        <button
          key={value ?? "clear"}
          type="button"
          aria-pressed={tool.current === value}
          disabled={tool.pending}
          onClick={() => tool.choose(value)}
          className={cn(
            "h-7 rounded border px-2",
            tool.current === value ? "border-[var(--gold)] text-hud-gold-bright" : "border-hud-rule text-hud-muted hover:text-hud-bone",
          )}
        >
          {tw(value ?? "clear")}
        </button>
      ))}
    </div>
  );
}
