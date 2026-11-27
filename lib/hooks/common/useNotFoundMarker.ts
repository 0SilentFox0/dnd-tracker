'use client';

import { useEffect, useSyncExternalStore } from 'react';

let active = false;

const listeners = new Set<() => void>();

function set(value: boolean) {
    if (active === value) return;

    active = value;
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
    listeners.add(listener);

    return () => listeners.delete(listener);
}

/** Rendered by not-found.tsx so the shell (breadcrumbs) outside the boundary can tell it is a 404. */
export function useMarkNotFound() {
    useEffect(() => {
        set(true);

        return () => set(false);
    }, []);
}

export function useIsNotFound(): boolean {
    return useSyncExternalStore(
        subscribe,
        () => active,
        () => false
    );
}
