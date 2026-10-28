"use client";

import { memo } from "react";

import { tokenBoxStyle } from "./token-box";

import { HitFloat } from "@/components/battle/hud";
import { useHitChange } from "@/lib/hooks/battle";
import type { FxImpact } from "@/lib/utils/battle/fx";
import { sizeOf } from "@/lib/utils/battle/grid";
import type { BattleParticipant } from "@/types/battle";

interface MapHitFloatProps {
  participant: BattleParticipant;
  box: { cx: number; cy: number; size: number };
  mapSize: { width: number; height: number };
  pxPerUnit: number;
  impact?: FxImpact | null;
}

const clamp = (min: number, value: number, max: number) => Math.min(max, Math.max(min, value));

/** «−N/+N» над жетоном; окремо від HUD, бо смертельний удар прибирає жетон із карти. */
function MapHitFloatImpl({ participant, box, mapSize, pxPerUnit, impact = null }: MapHitFloatProps) {
  const { change } = useHitChange(participant, impact);

  if (!change) return null;

  const cellPx = (box.size * pxPerUnit) / sizeOf(participant);

  return (
    <div data-map-hit-float={participant.basicInfo.id} className="pointer-events-none absolute z-30" style={tokenBoxStyle(box, mapSize)}>
      <HitFloat change={change} className="bottom-[70%] left-1/2 -translate-x-1/2 whitespace-nowrap" style={{ fontSize: clamp(13, cellPx * 0.45, 30) }} />
    </div>
  );
}

export const MapHitFloat = memo(MapHitFloatImpl);
