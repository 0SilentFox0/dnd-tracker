import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** false in the server HTML and during hydration, true afterwards: gates UI that depends on client-only state. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}
