"use client";

import { useCallback } from "react";

import { createSessionFlag, type StorageValue, useStorageValue } from "./storage-value";

export type PlayerViewScope = { kind: "battle"; id: string } | { kind: "show"; id: string };

const stores = new Map<string, StorageValue<boolean>>();

const NOOP_STORE: StorageValue<boolean> = { get: () => false, set: () => undefined, subscribe: () => () => undefined };

const keyOf = (scope: PlayerViewScope) => (scope.kind === "show" ? `player-view:show:${scope.id}` : `player-view:${scope.id}`);

function storeFor(scope: PlayerViewScope | null): StorageValue<boolean> {
  if (!scope) return NOOP_STORE;

  const key = keyOf(scope);

  let store = stores.get(key);

  if (!store) {
    store = createSessionFlag(key);
    stores.set(key, store);
  }

  return store;
}

export function usePlayerView(scope: PlayerViewScope | null): { enabled: boolean; toggle(): void; set(v: boolean): void } {
  const store = storeFor(scope);

  const enabled = useStorageValue(store, false);

  const set = useCallback((v: boolean) => store.set(v), [store]);

  const toggle = useCallback(() => store.set(!store.get()), [store]);

  return { enabled, toggle, set };
}
