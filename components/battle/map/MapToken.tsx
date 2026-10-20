"use client";

import { memo } from "react";

import { StatusAuras } from "@/components/battle/fx/auras/StatusAuras";
import { HitFrame } from "@/components/battle/fx/PortraitFx";
import { Portrait } from "@/components/battle/hud";
import { useHitFx } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import type { FxImpact } from "@/lib/utils/battle/fx";
import { isDown } from "@/lib/utils/battle/participant/state";
import { NO_EFFECTS } from "@/lib/utils/battle/view";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

const PORTRAIT_SHARE = 0.7;

export interface MapTokenProps {
  participant: BattleParticipant;
  box: { cx: number; cy: number; size: number };
  mapSize: { width: number; height: number };
  pxPerUnit: number;
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

function MapTokenImpl({ participant, box, mapSize, pxPerUnit, selected, current, passThrough, impact = null, effects = NO_EFFECTS, dormant, onClick, onHover }: MapTokenProps) {
  const { id, name } = participant.basicInfo;

  const { width, height } = mapSize;

  const { change, shakeRef, delayStyle } = useHitFx<HTMLButtonElement>(participant.combatStats.currentHp, impact);

  const portraitPx = Math.max(12, Math.round(box.size * pxPerUnit * PORTRAIT_SHARE));

  return (
    <div
      data-dormant={dormant || undefined}
      className="pointer-events-none absolute transition-[left,top] duration-[250ms] ease-out motion-reduce:transition-none"
      style={{
        left: `${((box.cx - box.size / 2) / width) * 100}%`,
        top: `${((box.cy - box.size / 2) / height) * 100}%`,
        width: `${(box.size / width) * 100}%`,
        height: `${(box.size / height) * 100}%`,
        zIndex: isDown(participant) ? 1 : 2,
      }}
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
          style={delayStyle}
          className={cn("inline-flex rounded-full", change && (change.delta < 0 ? "animate-[hud-flash-red_.5s]" : "animate-[hud-flash-green_.7s]"))}
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
