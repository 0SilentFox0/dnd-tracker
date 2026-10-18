"use client";

import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  document.addEventListener("visibilitychange", cb);

  return () => document.removeEventListener("visibilitychange", cb);
}

export function usePageHidden() {
  return useSyncExternalStore(subscribe, () => document.hidden, () => false);
}
