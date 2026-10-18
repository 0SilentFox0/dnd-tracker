"use client";

import { useEffect, useRef } from "react";

import "@/components/battle/fx/fx.css";
import { playFx } from "@/components/battle/fx/runtime/play";
import { cancelLayer } from "@/components/battle/fx/runtime/stage";
import { useBattleFxQueue, useFxEnabled } from "@/lib/hooks/battle";
import { MAX_FX_MS } from "@/lib/utils/battle/fx";

export function BattleFxLayer() {
  const layer = useRef<HTMLDivElement>(null);

  const { enabled } = useFxEnabled();

  const { current, done, active } = useBattleFxQueue(enabled);

  // Hidden tab, FX off or unmount: drop the running animation, so nothing stale resumes later.
  useEffect(() => {
    const el = layer.current;

    if (!active || !el) return;

    return () => cancelLayer(el);
  }, [active]);

  useEffect(() => {
    const el = layer.current;

    if (!current || !el) return;

    let finished = false;

    const finish = () => {
      if (finished) return;

      finished = true;
      done(current.key);
    };

    const guard = window.setTimeout(finish, MAX_FX_MS);

    // async so done() never runs synchronously inside the effect
    Promise.resolve()
      .then(() => playFx(el, current))
      .catch((e: unknown) => console.warn("battle fx", e))
      .finally(() => {
        window.clearTimeout(guard);
        finish();
      });
  }, [current, done]);

  return <div ref={layer} className="fx-layer fixed" aria-hidden />;
}
