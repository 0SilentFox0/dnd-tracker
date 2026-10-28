"use client";

import { useCallback, useRef } from "react";

/** Sums per-key error counts reported by several AbilityListEditors into one total. */
export function useErrorTotals(onTotal?: (ok: boolean, total: number) => void) {
  const counts = useRef(new Map<string, number>());

  const emit = useCallback(() => {
    const total = [...counts.current.values()].reduce((a, b) => a + b, 0);

    onTotal?.(total === 0, total);
  }, [onTotal]);

  const report = useCallback(
    (key: string, count: number) => {
      if ((counts.current.get(key) ?? 0) === count) return;

      counts.current.set(key, count);
      emit();
    },
    [emit],
  );

  const drop = useCallback(
    (key: string) => {
      if (counts.current.delete(key)) emit();
    },
    [emit],
  );

  return { report, drop };
}
