"use client";

import { AuraCanvas } from "./canvas/AuraCanvas";

import { useFxEnabled } from "@/lib/hooks/battle";
import { aurasOf } from "@/lib/utils/battle/fx";
import type { ActiveEffect } from "@/types/battle";

export function StatusAuras({ effects, size }: { effects: ActiveEffect[]; size: number }) {
  const { enabled } = useFxEnabled();

  const kinds = aurasOf(effects);

  if (!enabled || !kinds.length) return null;

  return <AuraCanvas kinds={kinds} size={size} />;
}
