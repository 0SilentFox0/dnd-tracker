"use client";

import { memo } from "react";

import { PORTRAIT_SHARE } from "./constants";
import { type MapPlacement, tokenBoxStyle } from "./token-box";

import { StatusAuras } from "@/components/battle/fx/auras/StatusAuras";
import { HitFrame } from "@/components/battle/fx/PortraitFx";
import { hitFlashClass, Portrait } from "@/components/battle/hud";
import { useHitFx } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import type { FxImpact } from "@/lib/utils/battle/fx";
import { isFallen } from "@/lib/utils/battle/grid";
import { isDown } from "@/lib/utils/battle/participant/state";
import { NO_EFFECTS } from "@/lib/utils/battle/view";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

export interface MapTokenProps {
  participant: BattleParticipant;
  placement: MapPlacement;
  selected?: boolean;
  current?: boolean;
  passThrough?: boolean;
  impact?: FxImpact | null;
  /** анімовані аури станів, як на портреті в списку; іконок на карті немає */
  effects?: readonly ActiveEffect[];
  /** лабіринт: сплячий ворог — напівпрозорий із «z» */
  dormant?: boolean;
  onClick?: (id: string) => void;
  onHover?: (id: string | null) => void;
}

function MapTokenImpl({ participant: live, placement, selected, current, passThrough, impact = null, effects = NO_EFFECTS, dormant, onClick, onHover }: MapTokenProps) {
  const { change, shown: participant, shakeRef } = useHitFx<HTMLButtonElement>(live, impact);

  const { box, mapSize, pxPerUnit } = placement;

  const { id, name } = participant.basicInfo;

  if (isFallen(participant)) return null;

  const portraitPx = Math.max(12, Math.round(box.size * pxPerUnit * PORTRAIT_SHARE));

  return (
    <div
      data-dormant={dormant || undefined}
      className="pointer-events-none absolute transition-[left,top] duration-[250ms] ease-out motion-reduce:transition-none"
      style={{ ...tokenBoxStyle(box, mapSize), zIndex: isDown(participant) ? 1 : 2 }}
    >
      <button
        ref={shakeRef}
        type="button"
        aria-label={name}
        data-fx-participant={id}
        data-fx-anchor="map"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(id);
        }}
        onPointerEnter={onHover && (() => onHover(id))}
        onPointerLeave={onHover && (() => onHover(null))}
        className={cn("absolute left-1/2 top-0 flex -translate-x-1/2 items-center justify-center rounded-full", passThrough ? "pointer-events-none" : "pointer-events-auto", selected && "ring-2 ring-[var(--gold)]")}
        style={{ width: `${PORTRAIT_SHARE * 100}%`, height: `${PORTRAIT_SHARE * 100}%` }}
      >
        <HitFrame change={change} />
        <span
          key={`portrait:${change?.id ?? ""}`}
          data-map-token-flash={change ? (change.delta < 0 ? "damage" : "heal") : undefined}
          className={cn("inline-flex rounded-full", hitFlashClass(change))}
        >
          <Portrait participant={participant} size={portraitPx} current={current} />
        </span>
        <StatusAuras effects={effects} size={portraitPx} />
      </button>
      {dormant && (
        <span aria-hidden className="map-token-z" style={{ fontSize: Math.max(9, Math.round(portraitPx * 0.35)) }}>
          z
        </span>
      )}
    </div>
  );
}

export const MapToken = memo(MapTokenImpl);
