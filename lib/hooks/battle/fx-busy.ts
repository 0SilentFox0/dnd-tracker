'use client';

import { useSyncExternalStore } from 'react';

let busy = false;

const listeners = new Set<() => void>();

export function setFxBusy(next: boolean) {
    if (busy === next) return;

    busy = next;
    listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
    listeners.add(l);

    return () => listeners.delete(l);
};

export const useFxBusy = () =>
    useSyncExternalStore(
        subscribe,
        () => busy,
        () => false
    );
