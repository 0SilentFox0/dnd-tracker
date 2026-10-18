"use client";

import { EffectIcon, HealthBar, HealthLabel } from "@/components/battle/hud";
import { useDamageShake, useHpChange } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { sizeOf } from "@/lib/utils/battle/grid";
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

const TEXT_MIN_CELL = 28;

const clamp = (min: number, value: number, max: number) => Math.min(max, Math.max(min, value));

export function MapTokenHud({ participant, box, mapSize, pxPerUnit, exact, effects, raised }: MapTokenHudProps) {
  const { currentHp, maxHp } = participant.combatStats;

  const change = useHpChange(currentHp);

  const shake = useDamageShake<HTMLDivElement>(change);

  const down = isDown(participant);

  const cellPx = pxPerUnit * 100;

  const showText = cellPx >= TEXT_MIN_CELL;

  const boxPx = box.size * pxPerUnit;

  const cells = sizeOf(participant);

  const small = cells === 1;

  const cardPx = cells * cellPx;

  const maxIcons = small ? 3 : 5;

  const gap = Math.round(boxPx * 0.1);

  const nameFont = small ? clamp(7, cellPx * 0.17, 11) : clamp(9, cellPx * 0.2 / Math.sqrt(cells), 14);

  const hpFont = small ? nameFont : clamp(8, cellPx * 0.17, 12);

  const mapPx = mapSize.width * pxPerUnit;

  const wrapperLeft = ((box.cx - box.size / 2) / mapSize.width) * mapPx;

  const relLeft = clamp(-wrapperLeft, (boxPx - cardPx) / 2, mapPx - cardPx - wrapperLeft);

  const iconPx = Math.round(small ? clamp(8, cellPx * 0.2, 12) : clamp(12, cellPx * 0.22, 16));

  const cardHeight = nameFont * 1.3 + 12 + (showText && effects.length > 0 ? iconPx + 2 : 0);

  const below = (box.cy + box.size / 2) * pxPerUnit - gap + 4 + cardHeight <= mapSize.height * pxPerUnit;

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
        className={cn("absolute rounded-md border border-white/10 bg-black/70 backdrop-blur-[2px]", showText ? (small ? "px-1 py-0.5" : "px-1.5 py-1") : "p-0.5", down && "opacity-40")}
        style={{
          width: cardPx,
          left: relLeft,
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
        <HealthBar participant={participant} exact={exact} className={showText ? "mt-0.5" : "mt-0"} />
        {showText && effects.length > 0 && (
          <div className="mt-0.5 flex items-center gap-0.5 overflow-hidden text-[#cdb87e]" style={{ height: iconPx }}>
            {effects.slice(0, maxIcons).map((e) => (
              <span key={e.id} role="img" aria-label={e.name} title={e.name} className={e.type === "buff" ? undefined : "text-hud-danger"}>
                <EffectIcon effect={e} size={iconPx} />
              </span>
            ))}
            {effects.length > maxIcons && <span className="text-[var(--hud-muted)]" style={{ fontSize: hpFont }}>+{effects.length - maxIcons}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
