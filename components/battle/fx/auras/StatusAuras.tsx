"use client";

import dynamic from "next/dynamic";

import { useFxEnabled } from "@/lib/hooks/battle";
import { aurasOf } from "@/lib/utils/battle/fx";
import type { ActiveEffect } from "@/types/battle";

const AuraCanvas = dynamic(() => import("./canvas/AuraCanvas").then((m) => m.AuraCanvas), { ssr: false });

export function StatusAuras({ effects, size }: { effects: ActiveEffect[]; size: number }) {
  const { userEnabled, motionAllowed } = useFxEnabled();

  const kinds = aurasOf(effects);

  if (!userEnabled || !kinds.length) return null;

  return <AuraCanvas kinds={kinds} size={size} still={!motionAllowed} />;
}
