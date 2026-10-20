"use client";

import { useCallback, useRef } from "react";

/** Drops calls while one task runs: a double tap lands before React re-renders the button as disabled. */
export function useSingleFlight(): <T>(task: () => Promise<T>) => Promise<T> | null {
  const busy = useRef(false);

  return useCallback(<T,>(task: () => Promise<T>) => {
    if (busy.current) return null;

    busy.current = true;

    let run: Promise<T>;

    // a sync throw must still release busy, and the task keeps starting synchronously
    try {
      run = task();
    } catch (error) {
      run = Promise.reject(error);
    }

    return run.finally(() => {
      busy.current = false;
    });
  }, []);
}
