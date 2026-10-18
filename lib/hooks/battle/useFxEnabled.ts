"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "battle-fx";

const listeners = new Set<() => void>();

let reducedMotion: MediaQueryList | null | undefined;

// Cached: every row reads the snapshot on each render.
function reducedMotionQuery() {
  if (reducedMotion === undefined) reducedMotion = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

  return reducedMotion;
}

function readUser(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

function readMotion(): boolean {
  return !reducedMotionQuery()?.matches;
}

function subscribeUser(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);

  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function subscribeMotion(cb: () => void) {
  const mql = reducedMotionQuery();

  mql?.addEventListener?.("change", cb);

  return () => mql?.removeEventListener?.("change", cb);
}

/** `userEnabled` — перемикач гравця (аури); `motionAllowed` — системне «зменшити рух»; `enabled` — анімації дій і рамки. */
export function useFxEnabled() {
  const userEnabled = useSyncExternalStore(subscribeUser, readUser, () => false);

  const motionAllowed = useSyncExternalStore(subscribeMotion, readMotion, () => true);

  const setEnabled = useCallback((v: boolean) => {
    try {
      window.localStorage.setItem(KEY, v ? "on" : "off");
    } catch {
      // private mode: the toggle just won't persist
    }

    listeners.forEach((l) => l());
  }, []);

  return { enabled: userEnabled && motionAllowed, userEnabled, motionAllowed, setEnabled };
}
