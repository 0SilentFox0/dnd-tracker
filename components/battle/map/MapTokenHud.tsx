"use client";

import { EffectLine, HealthBar, HealthLabel } from "@/components/battle/hud";
import { useDamageShake, useHpChange } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { isDown } from "@/lib/utils/battle/participant/state";
import { hpRatio } from "@/lib/utils/battle/view";
import { signedDelta } from "@/lib/utils/common/format";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

export interface MapTokenHudProps {
  participant: BattleParticipant;
  box: { cx: number; cy: number; size: number };
  mapSize: { width: number; height: number };
  pxPerUnit: number;
  exact: boolean;
  effects: ActiveEffect[];
  raised: boolean;
}

const TEXT_MIN_CELL = 22;

const UNIT_PX_FLOOR = 0.6;

const clamp = (min: number, value: number, max: number) => Math.min(max, Math.max(min, value));

export function MapTokenHud({ participant, box, mapSize, pxPerUnit, exact, effects, raised }: MapTokenHudProps) {
  const { currentHp, maxHp } = participant.combatStats;

  const change = useHpChange(currentHp);

  const shake = useDamageShake<HTMLDivElement>(change);

  const down = isDown(participant);

  const cellPx = pxPerUnit * 100;

  const showText = cellPx >= TEXT_MIN_CELL;

  const boxPx = box.size * pxPerUnit;

  const cardPx = Math.max(boxPx, cellPx * 2.2);

  const gap = Math.round(boxPx * 0.1);

  const nameFont = clamp(9, cellPx * 0.2, 14);

  const hpFont = clamp(8, cellPx * 0.18, 12);

  const below = (box.cy - box.size / 2) / 100 < UNIT_PX_FLOOR;

  return (
    <div
      className="pointer-events-none absolute transition-[left,top] duration-[250ms] ease-out motion-reduce:transition-none"
      style={{
        left: `${((box.cx - box.size / 2) / mapSize.width) * 100}%`,
        top: `${((box.cy - box.size / 2) / mapSize.height) * 100}%`,
        width: `${(box.size / mapSize.width) * 100}%`,
        height: `${(box.size / mapSize.height) * 100}%`,
        zIndex: raised ? 20 : 10,
      }}
    >
      <div
        ref={shake}
        className={cn("absolute left-1/2 rounded-md border border-white/10 bg-black/70 backdrop-blur-[2px]", showText ? "px-1.5 py-1" : "p-0.5", down && "opacity-40")}
        style={{
          width: cardPx,
          marginLeft: -cardPx / 2,
          ...(below ? { top: `calc(100% - ${gap}px + 4px)` } : { bottom: `calc(100% - ${gap}px + 4px)` }),
        }}
      >
        {change && showText && (
          <span
            key={`float:${change.id}`}
            className={cn("hud-sc absolute left-1/2 top-0 z-10 -translate-x-1/2 font-extrabold opacity-0 [text-shadow:0_2px_6px_#000] animate-[hud-float_1.1s_ease-out]", change.delta < 0 ? "text-[#ff6a4d]" : "text-[#8fd07a]")}
            style={{ fontSize: nameFont * 1.6 }}
          >
            {signedDelta(change.delta)}
          </span>
        )}
        {showText && (
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
        <HealthBar participant={participant} exact={exact} className={showText ? "mt-0.5" : "mt-0"} />
        {showText && effects.length > 0 && <EffectLine effects={effects} />}
      </div>
    </div>
  );
}
