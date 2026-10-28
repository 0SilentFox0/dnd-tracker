"use client";

import { useCallback, useRef } from "react";

/** Sums per-key error counts reported by several AbilityListEditors into one total; `drop(key)` also drops nested `key-…` entries. */
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
      const dropped = [...counts.current.keys()].filter((k) => k === key || k.startsWith(`${key}-`));

      dropped.forEach((k) => counts.current.delete(k));

      if (dropped.length > 0) emit();
    },
    [emit],
  );

  return { report, drop };
}
