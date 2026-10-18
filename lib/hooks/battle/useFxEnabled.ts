"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "battle-fx";

const listeners = new Set<() => void>();

function read(): boolean {
  try {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;

    return window.localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);

  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function useFxEnabled() {
  const enabled = useSyncExternalStore(subscribe, read, () => false);

  const setEnabled = useCallback((v: boolean) => {
    try {
      window.localStorage.setItem(KEY, v ? "on" : "off");
    } catch {
      // private mode: the toggle just won't persist
    }

    listeners.forEach((l) => l());
  }, []);

  return { enabled, setEnabled };
}
