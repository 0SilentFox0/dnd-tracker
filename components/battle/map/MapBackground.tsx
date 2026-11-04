"use client";

import { memo, useCallback, useEffect, useState } from "react";
import Image from "next/image";

import { MotionBackground } from "./motion/MotionBackground";

import { DEFAULT_MAP_BACKGROUND } from "@/lib/constants/battle";
import { useLoadedAspect } from "@/lib/hooks/battle";
import { useReducedMotion } from "@/lib/hooks/common";
import { backgroundBox } from "@/lib/utils/battle/grid";
import type { BattleMapConfig } from "@/types/battle";

export const BACKGROUND_FADE_MS = 800;

interface LayerProps {
  map: BattleMapConfig;
  cellPx: number;
  phone: boolean;
  rotated: boolean;
  onReady?: () => void;
}

/** Фон цілком (без обрізання): клітинка фону = клітинка сітки, зсув — частки клітинки; непокрите лишається темним. */
function BackgroundLayer({ map, cellPx, phone, rotated, onReady }: LayerProps) {
  const src = map.background ?? DEFAULT_MAP_BACKGROUND;

  const { aspect, imgProps } = useLoadedAspect(src, onReady);

  const box = backgroundBox(map, cellPx, aspect);

  if (map.motion) return <MotionBackground map={map} motion={map.motion} cellPx={cellPx} rotated={rotated} phone={phone} onReady={onReady} />;

  const px = Math.ceil(box.width);

  return (
    <div data-map-background className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute" style={box}>
        <Image
          src={src}
          alt=""
          fill
          sizes={phone && px > 0 ? `${px}px` : "100vw"}
          className="object-contain object-left-top"
          priority
          {...imgProps}
        />
      </div>
    </div>
  );
}

interface Track {
  base: BattleMapConfig;
  previous: BattleMapConfig | null;
  ready: boolean;
}

const fade = (visible: boolean) => ({ opacity: visible ? 1 : 0, transitionDuration: `${BACKGROUND_FADE_MS}ms` });

/** Зміна фону: новий шар з'являється з opacity після завантаження, попередній одночасно зникає. */
export const MapBackground = memo(function MapBackground(props: Omit<LayerProps, "onReady">) {
  const { map } = props;

  const src = map.background ?? DEFAULT_MAP_BACKGROUND;

  const reduced = useReducedMotion();

  const [track, setTrack] = useState<Track>({ base: map, previous: null, ready: true });

  if ((track.base.background ?? DEFAULT_MAP_BACKGROUND) !== src) setTrack({ base: map, previous: reduced ? null : track.base, ready: reduced });

  const { previous, ready } = track;

  const markReady = useCallback(() => setTrack((t) => (t.ready ? t : { ...t, ready: true })), []);

  useEffect(() => {
    if (!ready || !previous) return;

    const id = setTimeout(() => setTrack((t) => ({ ...t, previous: null })), BACKGROUND_FADE_MS + 50);

    return () => clearTimeout(id);
  }, [ready, previous]);

  return (
    <>
      {previous && (
        <div key="previous" data-background-layer="previous" className="absolute inset-0 transition-opacity ease-in-out" style={fade(!ready)}>
          <BackgroundLayer {...props} map={previous} />
        </div>
      )}
      <div key={src} data-background-layer="current" className="absolute inset-0 transition-opacity ease-in-out" style={fade(ready)}>
        <BackgroundLayer {...props} onReady={markReady} />
      </div>
    </>
  );
});
