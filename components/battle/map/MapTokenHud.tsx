"use client";

import { memo } from "react";

import { tokenBoxStyle } from "./token-box";

import { useDamageShake, useFxEnabled, useHitChange } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { type FxImpact, hudMotifsOf } from "@/lib/utils/battle/fx";
import { isFallen, sizeOf } from "@/lib/utils/battle/grid";
import { isDown } from "@/lib/utils/battle/participant/state";
import { HEALTH_LABEL, healthSegments, healthState, hpRatio, hpTone, NO_EFFECTS } from "@/lib/utils/battle/view";
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
  onReturn?: () => void;
}

// портрет займає верхні 70% рамки; плашка може трохи зайти на його низ, але не закрити
const HUD_MAX_SHARE = 0.42;

// рамка 1px + відступи плашки
const PLAQUE_CHROME = { text: 6, bar: 4 };

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

function MapTokenHudImpl({ participant: live, box, mapSize, pxPerUnit, exact, raised, impact = null, effects = NO_EFFECTS, onReturn }: MapTokenHudProps) {
  const { change, shown: participant } = useHitChange(live, impact);

  const shake = useDamageShake<HTMLDivElement>(change);

  const { userEnabled, motionAllowed } = useFxEnabled();

  const motifs = userEnabled ? hudMotifsOf(effects) : [];

  const down = isDown(participant);

  if (isFallen(participant)) return null;

  const boxPx = box.size * pxPerUnit;

  const small = sizeOf(participant) === 1;

  const hpFont = clamp(7, boxPx * (small ? 0.12 : 0.06), small ? 11 : 13);

  const nameFont = small ? clamp(6, boxPx * 0.1, 9) : clamp(7, boxPx * 0.075, 14);

  const textBarPx = Math.round(hpFont * 1.45);

  const thinBarPx = clamp(4, Math.round(boxPx * 0.08), 8);

  const fits = (px: number) => px <= boxPx * HUD_MAX_SHARE;

  const showText = fits(nameFont * 1.25 + 1 + textBarPx + PLAQUE_CHROME.text);

  const showHud = showText || fits(thinBarPx + PLAQUE_CHROME.bar);

  if (!showHud && !onReturn) return null;

  const barPx = showText ? textBarPx : thinBarPx;

  const { ratio, text } = hpView(participant, exact);

  const width = `${ratio * 100}%`;

  return (
    <div
      data-map-hud={participant.basicInfo.id}
      className="pointer-events-none absolute transition-[left,top] duration-[250ms] ease-out motion-reduce:transition-none"
      style={{ ...tokenBoxStyle(box, mapSize), zIndex: raised ? 20 : 10 }}
    >
      {onReturn && (
        <button
          type="button"
          data-map-return
          className="hud-sc pointer-events-auto absolute left-1/2 top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/20 bg-black/80 px-2 py-0.5 text-[11px] font-bold text-[var(--ink)] hover:bg-black"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onReturn();
          }}
        >
          Повернутися
        </button>
      )}
      {showHud && (
        <div
          ref={shake}
          data-map-hud-strip
          data-hud-rim={motifs[0]}
          className={cn("map-hud-plaque absolute bottom-0 left-[3%] flex w-[94%] max-h-full flex-col justify-end", showText ? "px-[3px] py-[2px]" : "p-px", motionAllowed && "map-hud-anim", down && "opacity-40")}
        >
          {motifs.map((m) => (
            <i key={m} aria-hidden data-hud-fx={m} className="map-hud-fx" />
          ))}
          {showText && (
            <div data-map-hud-name className={cn("hud-sc relative truncate whitespace-nowrap text-center font-bold leading-tight text-[var(--ink)]", down && "line-through")} style={{ fontSize: nameFont }}>
              {participant.basicInfo.name}
            </div>
          )}
          <div data-map-hud-bar data-hp-tone={down ? "down" : hpTone(ratio)} className={cn("map-hud-bar relative shrink-0", showText && "mt-px")} style={{ height: barPx }}>
            <i data-map-hud-trail className="map-hud-trail" style={{ width }} />
            <i data-map-hud-fill className="map-hud-fill" style={{ width }} />
            {showText && (
              <span className={cn("map-hud-text", exact ? "font-sans font-semibold" : "hud-sc italic", down && "line-through")} style={{ fontSize: hpFont, lineHeight: `${barPx}px` }}>
                {text}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const MapTokenHud = memo(MapTokenHudImpl);
