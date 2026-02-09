"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY_PREFIX = "hero-scaling-";

export interface HeroScalingCoefficients {
  hpMultiplier: number;
  meleeMultiplier: number;
  rangedMultiplier: number;
}

const DEFAULTS: HeroScalingCoefficients = {
  hpMultiplier: 1,
  meleeMultiplier: 1,
  rangedMultiplier: 1,
};

function loadFromStorage(campaignId: string): HeroScalingCoefficients {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + campaignId);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<HeroScalingCoefficients>;
    return {
      hpMultiplier: typeof parsed.hpMultiplier === "number" ? parsed.hpMultiplier : DEFAULTS.hpMultiplier,
      meleeMultiplier: typeof parsed.meleeMultiplier === "number" ? parsed.meleeMultiplier : DEFAULTS.meleeMultiplier,
      rangedMultiplier: typeof parsed.rangedMultiplier === "number" ? parsed.rangedMultiplier : DEFAULTS.rangedMultiplier,
    };
  } catch {
    return DEFAULTS;
  }
}

function saveToStorage(campaignId: string, value: HeroScalingCoefficients) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + campaignId, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function useHeroScalingCoefficients(campaignId: string | undefined) {
  const [coefficients, setCoefficientsState] = useState<HeroScalingCoefficients>(() =>
    campaignId ? loadFromStorage(campaignId) : DEFAULTS
  );

  useEffect(() => {
    if (!campaignId) return;
    setCoefficientsState(loadFromStorage(campaignId));
  }, [campaignId]);

  const setCoefficients = useCallback(
    (update: Partial<HeroScalingCoefficients>) => {
      setCoefficientsState((prev) => {
        const next = { ...prev, ...update };
        if (campaignId) saveToStorage(campaignId, next);
        return next;
      });
    },
    [campaignId]
  );

  return { coefficients, setCoefficients };
}
