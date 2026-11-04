"use client";

import { useSyncExternalStore } from "react";

const subscribe = (notify: () => void) => {
  const observer = new MutationObserver(notify);

  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  return () => observer.disconnect();
};

export const useAppDark = () => useSyncExternalStore(subscribe, () => document.documentElement.classList.contains("dark"), () => true);
