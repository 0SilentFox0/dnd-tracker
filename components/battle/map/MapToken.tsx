"use client";

import { memo } from "react";

import { Portrait } from "@/components/battle/hud";
import { useDamageShake, useHpChange } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { isDown } from "@/lib/utils/battle/participant/state";
import type { BattleParticipant } from "@/types/battle";

const PORTRAIT_SHARE = 0.7;

export interface MapTokenProps {
  participant: BattleParticipant;
  box: { cx: number; cy: number; size: number };
  mapSize: { width: number; height: number };
  pxPerUnit: number;
  selected?: boolean;
  current?: boolean;
  passThrough?: boolean;
  onClick?: (id: string) => void;
}

function MapTokenImpl({ participant, box, mapSize, pxPerUnit, selected, current, passThrough, onClick }: MapTokenProps) {
  const { id, name } = participant.basicInfo;

  const { width, height } = mapSize;

  const change = useHpChange(participant.combatStats.currentHp);

  const shake = useDamageShake<HTMLButtonElement>(change);

  const portraitPx = Math.max(12, Math.round(box.size * pxPerUnit * PORTRAIT_SHARE));

  return (
    <div
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
        ref={shake}
        type="button"
        aria-label={name}
        data-fx-participant={id}
        data-fx-anchor="map"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(id);
        }}
        className={cn("absolute left-1/2 top-0 flex -translate-x-1/2 items-center justify-center rounded-full", passThrough ? "pointer-events-none" : "pointer-events-auto", selected && "ring-2 ring-[var(--gold)]")}
        style={{ width: `${PORTRAIT_SHARE * 100}%`, height: `${PORTRAIT_SHARE * 100}%` }}
      >
        <Portrait
          key={`portrait:${change?.id ?? ""}`}
          participant={participant}
          size={portraitPx}
          current={current}
          className={cn(change && (change.delta < 0 ? "animate-[hud-flash-red_.5s]" : "animate-[hud-flash-green_.7s]"))}
        />
      </button>
    </div>
  );
}

export const MapToken = memo(MapTokenImpl);
