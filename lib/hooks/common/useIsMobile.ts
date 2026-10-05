import { useSyncExternalStore } from "react";

export const MOBILE_QUERY = "(max-width: 639px)";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);

  mql.addEventListener("change", onChange);

  return () => mql.removeEventListener("change", onChange);
}

// server and first hydration pass render the desktop variant
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(MOBILE_QUERY).matches, () => false);
}
