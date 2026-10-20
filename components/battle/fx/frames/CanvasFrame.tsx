"use client";

import { useEffect, useRef } from "react";

import type { FrameAnimation } from "./types";

import { type Stage, stageFor, stopStage } from "@/components/battle/fx/runtime/stage";

const PAD = 16;

export function CanvasFrame({ frame, delayMs, light = false }: { frame: FrameAnimation; delayMs: number; light?: boolean }) {
  const layer = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = layer.current;

    let stage: Stage | undefined;

    if (!el) return;

    const timer = window.setTimeout(() => {
      // a collapsed host would give the frames a negative gradient radius
      if (!el.isConnected || el.clientWidth <= PAD * 2 || el.clientHeight <= PAD * 2) return;

      stage = stageFor(el);
      stage.canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
      void frame(stage, { x: PAD, y: PAD, w: el.clientWidth - PAD * 2, h: el.clientHeight - PAD * 2 }, { light });
    }, delayMs);

    // A replayed hit remounts the frame: stop the old one so it never draws on a detached canvas.
    return () => {
      window.clearTimeout(timer);

      if (stage) stopStage(stage);
    };
  }, [frame, delayMs, light]);

  return <span ref={layer} aria-hidden className="pointer-events-none absolute z-[5]" style={{ inset: -PAD }} />;
}
