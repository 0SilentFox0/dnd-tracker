"use client";

import { useEffect, useRef } from "react";

import { attachAura, auraBox } from "./loop";

import type { FxAuraKind } from "@/lib/utils/battle/fx";

export function AuraCanvas({ kinds, size, still = false }: { kinds: FxAuraKind[]; size: number; still?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  const key = kinds.join(",");

  useEffect(() => {
    const canvas = ref.current;

    if (!canvas || !key) return;

    return attachAura(canvas, key.split(",") as FxAuraKind[], size, still);
  }, [key, size, still]);

  const box = auraBox(size);

  return (
    <span aria-hidden className="pointer-events-none absolute" style={{ left: "50%", top: "50%", width: box, height: box, marginLeft: -box / 2, marginTop: -box / 2 }}>
      <canvas ref={ref} className="block size-full" />
    </span>
  );
}
