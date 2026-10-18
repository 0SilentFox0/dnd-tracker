import { useCallback, useSyncExternalStore } from "react";

import { mediaQueryList } from "./media-query";

export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = mediaQueryList(query);

      mql?.addEventListener?.("change", onChange);

      return () => mql?.removeEventListener?.("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(subscribe, () => mediaQueryList(query)?.matches ?? serverValue, () => serverValue);
}
