"use client";

import { useEffect, useId, useRef, useState } from "react";

import type { FxSpec } from "@/lib/utils/battle/fx";

export interface FxRunner {
  play: (layer: HTMLElement, spec: FxSpec, root: HTMLElement) => Promise<void>;
  cancel: (layer: HTMLElement) => void;
}

/** Plays the spell animation once on mount and again on `replay`; `settled` — the cast is over, its auras stay on. */
export function useSpellFxPlayback(spec: FxSpec | null, animate: boolean, runner: FxRunner) {
  const id = useId();

  const arenaRef = useRef<HTMLDivElement>(null);

  const layerRef = useRef<HTMLDivElement>(null);

  const [run, setRun] = useState({ token: 0, done: false });

  const { token } = run;

  useEffect(() => {
    const arena = arenaRef.current;

    const layer = layerRef.current;

    if (!animate || !spec || !arena || !layer) return;

    let live = true;

    runner
      .play(layer, { ...spec, key: `${id}-${token}` }, arena)
      .catch(() => undefined)
      .then(() => {
        if (live) setRun((r) => (r.token === token ? { token, done: true } : r));
      });

    return () => {
      live = false;
      runner.cancel(layer);
    };
  }, [id, token, animate, spec, runner]);

  return {
    arenaRef,
    layerRef,
    token,
    settled: !animate || !spec || run.done,
    replay: () => setRun((r) => ({ token: r.token + 1, done: false })),
  };
}
