"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("resize", onChange);

  return () => window.removeEventListener("resize", onChange);
}

const headerBottom = () => Math.max(0, Math.round(document.querySelector("header")?.getBoundingClientRect().bottom ?? 0));

// глобальна sticky-шапка з layout займає верх; бій має влізти в решту екрана
export function useBelowHeaderHeight(): string {
  const bottom = useSyncExternalStore(subscribe, headerBottom, () => 0);

  return `calc(100dvh - ${bottom}px)`;
}
