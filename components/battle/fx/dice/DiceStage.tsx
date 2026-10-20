"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import type { DiceEngine } from "./engine";
import { DICE_TOTAL_MS } from "./engine";

import type { DiceThrowSpec } from "@/lib/utils/battle/fx/dice";

export interface DiceStageHandle {
  play(spec: DiceThrowSpec): Promise<void>;
  cancel(): void;
}

export { DICE_TOTAL_MS };

export const loadDiceScene = () => import("./scene");

// WebGL-шар створюється при першому кидку й живе до виходу з бою: один рендерер на бій
export const DiceStage = forwardRef<DiceStageHandle>(function DiceStage(_, ref) {
  const host = useRef<HTMLDivElement>(null);

  const engine = useRef<Promise<DiceEngine | null> | null>(null);

  // скасування під час завантаження чанку сцени має зупинити кидок, що на нього чекає
  const runs = useRef(0);

  useImperativeHandle(ref, () => {
    const ensure = () => {
      engine.current ??= loadDiceScene()
        .then((m) => (host.current ? m.createThreeDice(host.current) : null))
        .catch((e: unknown) => {
          console.warn("dice stage", e);

          return null;
        });

      return engine.current;
    };

    return {
      async play(spec) {
        const run = ++runs.current;

        const e = await ensure();

        if (e && run === runs.current) await e.roll(spec);
      },
      cancel() {
        runs.current++;
        void engine.current?.then((e) => e?.cancel());
      },
    };
  }, []);

  useEffect(
    () => () => {
      runs.current++;

      const pending = engine.current;

      // StrictMode монтує вдруге: наступний кидок створить новий рушій замість звільненого
      engine.current = null;
      void pending?.then((e) => e?.dispose());
    },
    [],
  );

  return <div ref={host} className="fx-dice-layer" aria-hidden />;
});
