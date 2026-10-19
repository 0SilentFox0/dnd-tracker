"use client";

import { memo } from "react";

import { HealthBar, HealthLabel } from "@/components/battle/hud";
import { useHitFx } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import type { FxImpact } from "@/lib/utils/battle/fx";
import { sizeOf } from "@/lib/utils/battle/grid";
import { isDown } from "@/lib/utils/battle/participant/state";
import { hpRatio } from "@/lib/utils/battle/view";
import { signedDelta } from "@/lib/utils/common/format";
import type { BattleParticipant } from "@/types/battle";

export interface MapTokenHudProps {
  participant: BattleParticipant;
  box: { cx: number; cy: number; size: number };
  mapSize: { width: number; height: number };
  pxPerUnit: number;
  exact: boolean;
  raised: boolean;
  impact?: FxImpact | null;
}

const TEXT_MIN_CELL = 28;

const clamp = (min: number, value: number, max: number) => Math.min(max, Math.max(min, value));

function MapTokenHudImpl({ participant, box, mapSize, pxPerUnit, exact, raised, impact = null }: MapTokenHudProps) {
  const { currentHp, maxHp } = participant.combatStats;

  const { change, shakeRef: shake, delayStyle } = useHitFx<HTMLDivElement>(currentHp, impact);

  const down = isDown(participant);

  const cellPx = pxPerUnit * 100;

  const showText = cellPx >= TEXT_MIN_CELL;

  const boxPx = box.size * pxPerUnit;

  const small = sizeOf(participant) === 1;

  const nameFont = clamp(6, boxPx * (small ? 0.11 : 0.075), small ? 11 : 14);

  const hpFont = small ? nameFont : clamp(6, nameFont * 0.9, 12);

  const minStripPx = Math.ceil(nameFont * 1.25 + 7);

  return (
    <div
      data-map-hud={participant.basicInfo.id}
      className="pointer-events-none absolute transition-[left,top] duration-[250ms] ease-out motion-reduce:transition-none"
      style={{
        left: `${((box.cx - box.size / 2) / mapSize.width) * 100}%`,
        top: `${((box.cy - box.size / 2) / mapSize.height) * 100}%`,
        width: `${(box.size / mapSize.width) * 100}%`,
        height: `${(box.size / mapSize.height) * 100}%`,
        zIndex: raised ? 20 : 10,
      }}
    >
      {change && showText && (
        <span
          key={`float:${change.id}`}
          className={cn("hud-sc absolute bottom-[30%] left-1/2 z-10 -translate-x-1/2 font-extrabold opacity-0 [text-shadow:0_2px_6px_#000] animate-[hud-float_1.1s_ease-out]", change.delta < 0 ? "text-[#ff6a4d]" : "text-[#8fd07a]")}
          style={{ ...delayStyle, fontSize: nameFont * 1.6 }}
        >
          {signedDelta(change.delta)}
        </span>
      )}
      <div
        ref={shake}
        data-map-hud-strip
        className={cn("absolute bottom-0 left-[3%] flex w-[94%] max-h-full flex-col justify-end overflow-hidden rounded-md border border-white/10 bg-black/70 px-1 py-0.5 backdrop-blur-[2px]", down && "opacity-40")}
        style={showText ? { height: `max(28%, ${minStripPx}px)` } : undefined}
      >
        {showText && small && (
          <div className={cn("flex justify-center whitespace-nowrap font-sans font-medium leading-tight", down && "line-through")} style={{ fontSize: hpFont }}>
            {exact ? (
              <span className={cn("truncate", hpRatio(participant) <= 0.25 ? "text-[#e04a35]" : "text-[#d6cbb7]")}>
                {currentHp}/{maxHp}
              </span>
            ) : (
              <span className="truncate [&>span]:ml-0 [&>span]:text-[length:inherit]">
                <HealthLabel participant={participant} />
              </span>
            )}
          </div>
        )}
        {showText && !small && (
          <div className={cn("hud-sc flex items-center whitespace-nowrap font-bold leading-tight text-[var(--ink)]", down && "line-through")} style={{ fontSize: nameFont }}>
            <span className="truncate">{participant.basicInfo.name}</span>
            {exact ? (
              <span className={cn("ml-auto pl-1.5 font-sans font-medium tracking-normal", hpRatio(participant) <= 0.25 ? "text-[#e04a35]" : "text-[#d6cbb7]")} style={{ fontSize: hpFont }}>
                {currentHp} / {maxHp}
              </span>
            ) : (
              <span className="ml-auto" style={{ fontSize: hpFont }}>
                <HealthLabel participant={participant} />
              </span>
            )}
          </div>
        )}
        <HealthBar participant={participant} exact={exact} className="mt-0.5 shrink-0" />
      </div>
    </div>
  );
}

export const MapTokenHud = memo(MapTokenHudImpl);
