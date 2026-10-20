"use client";

import { useSyncExternalStore } from "react";

export interface StorageValue<T> {
  get(): T;
  set(value: T): void;
  subscribe(onChange: () => void): () => void;
}

export interface StorageCodec<T> {
  /** raw === null — ключа немає; сміття теж має повернути значення за замовчуванням */
  parse(raw: string | null): T;
  serialize(value: T): string;
}

/**
 * A value kept in localStorage. It is cached and re-read only on `set` or a `storage` event from another
 * tab, so a snapshot read on every render never touches localStorage.
 */
export function createStorageValue<T>(key: string, defaultValue: T, codec: StorageCodec<T>): StorageValue<T> {
  const listeners = new Set<() => void>();

  let cached: T | undefined;

  let unheard = false;

  const read = () => {
    try {
      return codec.parse(window.localStorage.getItem(key));
    } catch {
      return defaultValue;
    }
  };

  const notify = () => listeners.forEach((l) => l());

  const onStorage = (e: StorageEvent) => {
    if ((e.storageArea && e.storageArea !== window.localStorage) || (e.key !== null && e.key !== key)) return;

    cached = read();
    notify();
  };

  return {
    get: () => (cached ??= read()),
    set(value) {
      // через parse, щоб кеш і сховище тримали те саме нормалізоване значення (clamp), що прочитає інша вкладка
      cached = codec.parse(codec.serialize(value));

      try {
        window.localStorage.setItem(key, codec.serialize(cached));
      } catch {
        // private mode: the value just won't persist
      }

      notify();
    },
    subscribe(onChange) {
      if (!listeners.size) {
        // Another tab may have changed the value while nobody listened for `storage` events.
        if (unheard) cached = undefined;

        window.addEventListener("storage", onStorage);
      }

      listeners.add(onChange);

      return () => {
        listeners.delete(onChange);

        if (!listeners.size) {
          window.removeEventListener("storage", onStorage);
          unheard = true;
        }
      };
    },
  };
}

/** "on"/"off" */
export function createStorageFlag(key: string, defaultValue: boolean): StorageValue<boolean> {
  return createStorageValue(key, defaultValue, {
    parse: (raw) => (raw === "on" ? true : raw === "off" ? false : defaultValue),
    serialize: (v) => (v ? "on" : "off"),
  });
}

export function createStorageNumber(key: string, defaultValue: number, clamp: (v: number) => number = (v) => v): StorageValue<number> {
  return createStorageValue(key, defaultValue, {
    parse: (raw) => {
      const n = raw === null ? NaN : Number(raw);

      return Number.isFinite(n) ? clamp(n) : defaultValue;
    },
    serialize: String,
  });
}

export function useStorageValue<T>(store: StorageValue<T>, serverValue: T): T {
  return useSyncExternalStore(store.subscribe, store.get, () => serverValue);
}
