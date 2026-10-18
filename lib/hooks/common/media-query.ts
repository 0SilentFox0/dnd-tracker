const lists = new Map<string, MediaQueryList>();

let cachedFor: typeof window.matchMedia | undefined;

/** One MediaQueryList per query: snapshots are read on every render of every subscriber. */
export function mediaQueryList(query: string): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;

  // Keyed by the function too, so a test that swaps `matchMedia` gets fresh lists.
  if (cachedFor !== window.matchMedia) {
    lists.clear();
    cachedFor = window.matchMedia;
  }

  let mql = lists.get(query);

  if (!mql) {
    mql = window.matchMedia(query);
    lists.set(query, mql);
  }

  return mql;
}

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** For effects and handlers; components use `useReducedMotion`. */
export function prefersReducedMotion(): boolean {
  return mediaQueryList(REDUCED_MOTION_QUERY)?.matches ?? false;
}
