"use client";

import { useEffect, useRef } from "react";

import "@/components/battle/fx/fx.css";
import { ANIMATIONS } from "@/components/battle/fx/animations";
import { resolvePoints } from "@/components/battle/fx/runtime/anchors";
import { stageFor } from "@/components/battle/fx/runtime/canvas";
import { PALETTE } from "@/components/battle/fx/runtime/palette";
import { useBattleFxQueue, useFxEnabled } from "@/lib/hooks/battle";

const MAX_FX_MS = 3000;

export function BattleFxLayer() {
  const layer = useRef<HTMLDivElement>(null);

  const { enabled } = useFxEnabled();

  const { current, done } = useBattleFxQueue(enabled);

  useEffect(() => {
    const el = layer.current;

    if (!current || !el) return;

    let finished = false;

    const finish = () => {
      if (finished) return;

      finished = true;
      done();
    };

    // a broken animation must never stall the queue
    const guard = window.setTimeout(finish, MAX_FX_MS);

    // async so done() never runs synchronously inside the effect
    Promise.resolve()
      .then(() => {
        const points = resolvePoints(current);

        return points ? ANIMATIONS[current.archetype]({ spec: current, stage: stageFor(el), layer: el, ...points, palette: PALETTE[current.element] }) : undefined;
      })
      .catch((e: unknown) => console.warn("battle fx", e))
      .finally(() => {
        window.clearTimeout(guard);
        finish();
      });
  }, [current, done]);

  return <div ref={layer} className="fx-layer fixed" aria-hidden />;
}
