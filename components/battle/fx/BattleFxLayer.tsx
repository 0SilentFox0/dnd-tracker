"use client";

import { useEffect, useRef } from "react";

import "@/components/battle/fx/fx.css";
import { preloadAnimation } from "@/components/battle/fx/animations";
import { FX_LOAD_TIMEOUT_MS, playFx } from "@/components/battle/fx/runtime/play";
import { cancelLayer } from "@/components/battle/fx/runtime/stage";
import { useBattleFxQueue, useFxEnabled } from "@/lib/hooks/battle";
import { MAX_FX_MS } from "@/lib/utils/battle/fx";

export function BattleFxLayer() {
  const layer = useRef<HTMLDivElement>(null);

  const { enabled } = useFxEnabled();

  const { current, queue, done, active } = useBattleFxQueue(enabled);

  // Signatures load the moment they are queued, so they are ready by their turn.
  useEffect(() => {
    for (const spec of queue) if (spec.archetype !== "dice") preloadAnimation(spec.archetype);
  }, [queue]);

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

    let cancelled = false;

    const finish = () => {
      if (finished || cancelled) return;

      finished = true;
      done(current.key);
    };

    // The stuck animation is cancelled, or it would keep drawing over the next one on the same stage.
    const guard = window.setTimeout(() => {
      cancelLayer(el);
      finish();
    }, MAX_FX_MS + FX_LOAD_TIMEOUT_MS);

    // async so done() never runs synchronously inside the effect
    Promise.resolve()
      .then(() => (cancelled || current.archetype === "dice" ? undefined : playFx(el, current)))
      .catch((e: unknown) => console.warn("battle fx", e))
      .finally(() => {
        window.clearTimeout(guard);
        finish();
      });

    // StrictMode's discarded pass must not start a second run on the same stage.
    return () => {
      cancelled = true;
      window.clearTimeout(guard);
    };
  }, [current, done]);

  return <div ref={layer} className="fx-layer" aria-hidden />;
}
