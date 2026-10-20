"use client";

import { useCallback, useMemo, useState } from "react";

import type { MapWeatherData } from "@/types/api";
import type { WeatherKind } from "@/types/battle";

export interface MapWeatherTool {
  active: boolean;
  toggle(): void;
  current: WeatherKind | null;
  pending: boolean;
  choose(kind: WeatherKind | null): void;
}

export function useMapWeatherTool(args: {
  isDM: boolean;
  current: WeatherKind | null;
  mutation: { mutate(data: MapWeatherData): void; isPending: boolean };
}): MapWeatherTool | null {
  const {
    isDM,
    current,
    mutation: { mutate, isPending },
  } = args;

  const [active, setActive] = useState(false);

  const toggle = useCallback(() => setActive((o) => !o), []);

  const choose = useCallback(
    (kind: WeatherKind | null) => {
      setActive(false);

      if (kind !== current) mutate({ weather: kind });
    },
    [current, mutate],
  );

  const tool = useMemo(() => ({ active, toggle, current, pending: isPending, choose }), [active, toggle, current, isPending, choose]);

  return isDM ? tool : null;
}
