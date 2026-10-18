"use client";

import { memo } from "react";

import { Portrait } from "@/components/battle/hud";
import { useDamageShake, useHpChange } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { isDown } from "@/lib/utils/battle/participant/state";
import type { BattleParticipant } from "@/types/battle";

export interface MapTokenProps {
  participant: BattleParticipant;
  box: { cx: number; cy: number; size: number };
  mapSize: { width: number; height: number };
  pxPerUnit: number;
  selected?: boolean;
  current?: boolean;
  onClick?: (id: string) => void;
}

function MapTokenImpl({ participant, box, mapSize, pxPerUnit, selected, current, onClick }: MapTokenProps) {
  const { id, name } = participant.basicInfo;

  const { width, height } = mapSize;

  const change = useHpChange(participant.combatStats.currentHp);

  const shake = useDamageShake<HTMLButtonElement>(change);

  const portraitPx = Math.max(12, Math.round(box.size * pxPerUnit * 0.8));

  return (
    <div
      className="absolute flex items-center justify-center transition-[left,top] duration-[250ms] ease-out motion-reduce:transition-none"
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
        className={cn("flex h-full w-full flex-col items-center justify-center rounded-full", selected && "ring-2 ring-[var(--gold)]")}
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
