"use client";

import { useEffect, useRef } from "react";

import { type Stage, stageFor } from "../../runtime/canvas";
import { wait } from "../../runtime/geometry";
import type { FrameAnimation } from "./types";

const PAD = 16;

export function CanvasFrame({ frame, delayMs }: { frame: FrameAnimation; delayMs: number }) {
  const layer = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = layer.current;

    let cancelled = false;

    let stage: Stage | undefined;

    if (!el) return;

    void wait(delayMs).then(() => {
      if (cancelled || !el.isConnected) return;

      stage = stageFor(el);
      stage.canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%";

      return frame(stage, { x: PAD, y: PAD, w: el.clientWidth - PAD * 2, h: el.clientHeight - PAD * 2 });
    });

    // A replayed hit remounts the frame: stop the old one so its loop does not run on a detached canvas.
    return () => {
      cancelled = true;

      if (!stage) return;

      stage.draws.clear();
      stage.tweens.clear();
      stage.particles = [];
    };
  }, [frame, delayMs]);

  return <span ref={layer} aria-hidden className="pointer-events-none absolute z-[5]" style={{ inset: -PAD }} />;
}
