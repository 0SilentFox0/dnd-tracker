'use client';

import { useCallback, useEffect } from 'react';

import {
    createSessionFlag,
    type StorageValue,
    useStorageValue,
} from './storage-value';
import { useHydrated } from './useHydrated';

import {
    PLAYER_VIEW_PENDING_ATTR,
    playerViewKey,
    type PlayerViewScope,
} from '@/lib/utils/common/player-view';

const stores = new Map<string, StorageValue<boolean>>();

const NOOP_STORE: StorageValue<boolean> = {
    get: () => false,
    set: () => undefined,
    subscribe: () => () => undefined,
};

function storeFor(scope: PlayerViewScope | null): StorageValue<boolean> {
    if (!scope) return NOOP_STORE;

    const key = playerViewKey(scope);

    let store = stores.get(key);

    if (!store) {
        store = createSessionFlag(key);
        stores.set(key, store);
    }

    return store;
}

export type { PlayerViewScope };

export function usePlayerView(scope: PlayerViewScope | null): {
    enabled: boolean;
    toggle(): void;
    set(v: boolean): void;
} {
    const store = storeFor(scope);

    const enabled = useStorageValue(store, false);

    const hydrated = useHydrated();

    // Same component and render as the flag read: the SSR guard lifts only once the consumer (not a sibling that hydrates earlier) has the real state.
    useEffect(() => {
        if (hydrated)
            document.documentElement.removeAttribute(PLAYER_VIEW_PENDING_ATTR);
    }, [hydrated]);

    const set = useCallback((v: boolean) => store.set(v), [store]);

    const toggle = useCallback(() => store.set(!store.get()), [store]);

    return { enabled, toggle, set };
}

export function resetPlayerViews() {
    stores.forEach((store) => store.set(false));

    try {
        Object.keys(window.sessionStorage)
            .filter((k) => k.startsWith('player-view:'))
            .forEach((k) => window.sessionStorage.removeItem(k));
    } catch {
        // storage unavailable
    }
}
