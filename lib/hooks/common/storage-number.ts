"use client";

import { useSyncExternalStore } from "react";

export interface StorageNumber {
  get(): number;
  set(value: number): void;
  subscribe(onChange: () => void): () => void;
}

export function createStorageNumber(key: string, defaultValue: number, clamp: (v: number) => number = (v) => v): StorageNumber {
  const listeners = new Set<() => void>();

  let cached: number | undefined;

  const read = () => {
    try {
      const raw = window.localStorage.getItem(key);

      const n = raw === null ? NaN : Number(raw);

      return Number.isFinite(n) ? clamp(n) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  return {
    get: () => (cached ??= read()),
    set(value) {
      cached = clamp(value);

      try {
        window.localStorage.setItem(key, String(cached));
      } catch {
        // приватний режим: значення просто не збережеться
      }

      listeners.forEach((l) => l());
    },
    subscribe(onChange) {
      listeners.add(onChange);

      return () => listeners.delete(onChange);
    },
  };
}

export function useStorageNumber(store: StorageNumber, serverValue: number): number {
  return useSyncExternalStore(store.subscribe, store.get, () => serverValue);
}
