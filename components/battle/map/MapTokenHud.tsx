"use client";

import { memo } from "react";

import { useFxEnabled, useHitFx } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { type FxImpact, hudMotifsOf } from "@/lib/utils/battle/fx";
import { sizeOf } from "@/lib/utils/battle/grid";
import { isDown } from "@/lib/utils/battle/participant/state";
import { HEALTH_LABEL, healthSegments, healthState, hpRatio, hpTone, NO_EFFECTS } from "@/lib/utils/battle/view";
import { signedDelta } from "@/lib/utils/common/format";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

export interface MapTokenHudProps {
  participant: BattleParticipant;
  box: { cx: number; cy: number; size: number };
  mapSize: { width: number; height: number };
  pxPerUnit: number;
  exact: boolean;
  raised: boolean;
  impact?: FxImpact | null;
  effects?: readonly ActiveEffect[];
}

const TEXT_MIN_CELL = 28;

const clamp = (min: number, value: number, max: number) => Math.min(max, Math.max(min, value));

function hpView(participant: BattleParticipant, exact: boolean) {
  const { currentHp, maxHp } = participant.combatStats;

  if (exact) {
    const ratio = hpRatio(participant);

    return { ratio, text: `${currentHp}/${maxHp}` };
  }

  const state = healthState(participant);

  return { ratio: healthSegments(state) / 4, text: HEALTH_LABEL[state] };
}

function MapTokenHudImpl({ participant, box, mapSize, pxPerUnit, exact, raised, impact = null, effects = NO_EFFECTS }: MapTokenHudProps) {
  const { change, shakeRef: shake, delayStyle } = useHitFx<HTMLDivElement>(participant.combatStats.currentHp, impact);

  const { userEnabled, motionAllowed } = useFxEnabled();

  const motifs = userEnabled ? hudMotifsOf(effects) : [];

  const down = isDown(participant);

  const showText = pxPerUnit * 100 >= TEXT_MIN_CELL;

  const boxPx = box.size * pxPerUnit;

  const small = sizeOf(participant) === 1;

  const hpFont = clamp(7, boxPx * (small ? 0.12 : 0.06), small ? 11 : 13);

  const nameFont = clamp(7, boxPx * 0.075, 14);

  // з текстом смуга вміщує число; без тексту — тонка, але не тонша за 4 px на телефоні
  const barPx = showText ? Math.round(hpFont * 1.45) : clamp(4, Math.round(boxPx * 0.08), 8);

  const { ratio, text } = hpView(participant, exact);

  const width = `${ratio * 100}%`;

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
        data-hud-rim={motifs[0]}
        className={cn("map-hud-plaque absolute bottom-0 left-[3%] flex w-[94%] max-h-full flex-col justify-end", showText ? "px-[3px] py-[2px]" : "p-px", motionAllowed && "map-hud-anim", down && "opacity-40")}
      >
        {motifs.map((m) => (
          <i key={m} aria-hidden data-hud-fx={m} className="map-hud-fx" />
        ))}
        {showText && !small && (
          <div className={cn("hud-sc relative truncate whitespace-nowrap text-center font-bold leading-tight text-[var(--ink)]", down && "line-through")} style={{ fontSize: nameFont }}>
            {participant.basicInfo.name}
          </div>
        )}
        <div data-map-hud-bar data-hp-tone={down ? "down" : hpTone(ratio)} className={cn("map-hud-bar relative shrink-0", !small && showText && "mt-px")} style={{ height: barPx }}>
          <i data-map-hud-trail className="map-hud-trail" style={{ width }} />
          <i data-map-hud-fill className="map-hud-fill" style={{ width }} />
          {showText && (
            <span className={cn("map-hud-text", exact ? "font-sans font-semibold" : "hud-sc italic", down && "line-through")} style={{ fontSize: hpFont, lineHeight: `${barPx}px` }}>
              {text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export const MapTokenHud = memo(MapTokenHudImpl);
