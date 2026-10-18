"use client";

import { createStorageFlag, useReducedMotion, useStorageFlag } from "@/lib/hooks/common";

const fxFlag = createStorageFlag("battle-fx", true);

/** `userEnabled` — перемикач гравця (аури); `motionAllowed` — системне «зменшити рух»; `enabled` — анімації дій і рамки. */
export function useFxEnabled() {
  const userEnabled = useStorageFlag(fxFlag);

  const motionAllowed = !useReducedMotion();

  return { enabled: userEnabled && motionAllowed, userEnabled, motionAllowed, setEnabled: fxFlag.set };
}
