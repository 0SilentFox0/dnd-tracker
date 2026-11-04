"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { DEFAULT_MAP_BACKGROUND } from "@/lib/constants/battle";
import { useReducedMotion } from "@/lib/hooks/common";
import { mirrorTileCount, motionInMapSpace, stepMotion } from "@/lib/utils/battle/map-motion";
import { subscribe } from "@/lib/utils/canvas/ticker";
import type { BattleMapConfig, MapMotion } from "@/types/battle";

const REST_PX_PER_S = 0.5;

function useTabVisible() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const sync = () => setVisible(!document.hidden);

    sync();
    document.addEventListener("visibilitychange", sync);

    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  return visible;
}

/** Фон, що їде під нерухомою сіткою: дзеркально зациклена доріжка тайлів, фаза крутиться локально в rAF. */
export function MotionBackground({ map, motion, cellPx, rotated, phone }: { map: BattleMapConfig; motion: MapMotion; cellPx: number; rotated: boolean; phone: boolean }) {
  const src = map.background ?? DEFAULT_MAP_BACKGROUND;

  const [loaded, setLoaded] = useState<{ src: string; aspect: number } | null>(null);

  const reduced = useReducedMotion();

  const visible = useTabVisible();

  const trackRef = useRef<HTMLDivElement>(null);

  const mapW = map.cols * cellPx;

  const mapH = map.rows * cellPx;

  const m = motionInMapSpace(motion, rotated);

  const horizontal = m.axis === "x";

  const aspect = loaded?.src === src ? loaded.aspect : null;

  const tileLen = aspect ? (horizontal ? mapH / aspect : mapW * aspect) : 0;

  const period = 2 * tileLen;

  const target = m.speed * cellPx;

  const state = useRef({ phase: 0, speed: target });

  const apply = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    apply.current = () => {
      const track = trackRef.current;

      if (!track) return;

      const offset = state.current.phase - period;

      track.style.transform = horizontal ? `translate3d(${offset}px,0,0)` : `translate3d(0,${offset}px,0)`;
    };
    apply.current();
  }, [horizontal, period]);

  useEffect(() => {
    if (!tileLen || reduced || !visible) return;

    if (target === 0 && Math.abs(state.current.speed) < REST_PX_PER_S) return;

    return subscribe((_now, dt) => {
      state.current = stepMotion(state.current, target, dt, period);
      apply.current?.();

      if (target === 0 && Math.abs(state.current.speed) < REST_PX_PER_S) {
        state.current.speed = 0;

        return false;
      }
    });
  }, [tileLen, period, target, reduced, visible]);

  if (!aspect) {
    return (
      <div data-map-background className="pointer-events-none absolute inset-0 overflow-hidden">
        <Image
          src={src}
          alt=""
          fill
          sizes={phone && mapW > 0 ? `${Math.ceil(mapW)}px` : "100vw"}
          className="object-contain object-left-top"
          priority
          onLoad={(e) => {
            const img = e.currentTarget;

            if (img.naturalWidth > 0) setLoaded({ src, aspect: img.naturalHeight / img.naturalWidth });
          }}
        />
      </div>
    );
  }

  const count = mirrorTileCount(horizontal ? mapW : mapH, tileLen);

  const tileSize = horizontal ? { width: tileLen, height: mapH } : { width: mapW, height: tileLen };

  return (
    <div data-map-background className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        ref={trackRef}
        data-motion-track
        data-motion-axis={m.axis}
        className="absolute left-0 top-0 flex will-change-transform"
        style={{ flexDirection: horizontal ? "row" : "column", ...(horizontal ? { width: count * tileLen, height: mapH } : { width: mapW, height: count * tileLen }) }}
      >
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="relative shrink-0" style={{ ...tileSize, transform: i % 2 ? (horizontal ? "scale(-1, 1)" : "scale(1, -1)") : undefined }}>
            <Image src={src} alt="" fill sizes={`${Math.ceil(tileSize.width)}px`} className="object-fill" />
          </div>
        ))}
      </div>
    </div>
  );
}
