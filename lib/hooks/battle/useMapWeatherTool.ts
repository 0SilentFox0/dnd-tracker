"use client";

import { useCallback, useMemo, useState } from "react";

import type { MapWeatherData } from "@/types/api";
import type { WeatherKind } from "@/types/battle";

export interface MapWeatherTool {
  open: boolean;
  toggle(): void;
  close(): void;
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

  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((o) => !o), []);

  const close = useCallback(() => setOpen(false), []);

  const choose = useCallback(
    (kind: WeatherKind | null) => {
      setOpen(false);

      if (kind !== current) mutate({ weather: kind });
    },
    [current, mutate],
  );

  const tool = useMemo(() => ({ open, toggle, close, current, pending: isPending, choose }), [open, toggle, close, current, isPending, choose]);

  return isDM ? tool : null;
}
