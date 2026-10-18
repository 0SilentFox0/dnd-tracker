"use client";

import { useSyncExternalStore } from "react";

export interface StorageFlag {
  get(): boolean;
  set(value: boolean): void;
  subscribe(onChange: () => void): () => void;
}

/**
 * A boolean kept in localStorage as "on"/"off". The value is cached and re-read only on `set` or a
 * `storage` event from another tab, so a snapshot read on every render never touches localStorage.
 */
export function createStorageFlag(key: string, defaultValue: boolean): StorageFlag {
  const listeners = new Set<() => void>();

  let cached: boolean | undefined;

  const read = () => {
    try {
      const raw = window.localStorage.getItem(key);

      return raw === "on" ? true : raw === "off" ? false : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== key) return;

    cached = read();
    listeners.forEach((l) => l());
  };

  return {
    get: () => (cached ??= read()),
    set(value) {
      try {
        window.localStorage.setItem(key, value ? "on" : "off");
      } catch {
        // private mode: the value just won't persist
      }

      cached = value;
      listeners.forEach((l) => l());
    },
    subscribe(onChange) {
      if (!listeners.size) window.addEventListener("storage", onStorage);

      listeners.add(onChange);

      return () => {
        listeners.delete(onChange);

        if (!listeners.size) window.removeEventListener("storage", onStorage);
      };
    },
  };
}

export function useStorageFlag(flag: StorageFlag, serverValue = false): boolean {
  return useSyncExternalStore(flag.subscribe, flag.get, () => serverValue);
}
