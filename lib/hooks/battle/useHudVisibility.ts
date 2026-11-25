'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

export type HudBlockKey = 'hero' | 'dock' | 'initiative' | 'tools';

export interface HudVisibility {
    all: boolean;
    collapsed: Partial<Record<HudBlockKey, boolean>>;
}

const STORAGE_KEY = 'battle-hud-visibility';

const EMPTY: HudVisibility = { all: false, collapsed: {} };

let state: HudVisibility = EMPTY;

let loaded = false;

const listeners = new Set<() => void>();

function load() {
    if (loaded || typeof window === 'undefined') return;

    loaded = true;

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);

        const parsed: unknown = raw ? JSON.parse(raw) : null;

        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const p = parsed as Partial<HudVisibility>;

            state = {
                all: p.all === true,
                collapsed:
                    p.collapsed &&
                    typeof p.collapsed === 'object' &&
                    !Array.isArray(p.collapsed)
                        ? p.collapsed
                        : {},
            };
        }
    } catch {}
}

function commit(next: HudVisibility) {
    state = next;

    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}

    listeners.forEach((l) => l());
}

export function toggleHudBlock(key: HudBlockKey) {
    load();

    commit({
        ...state,
        collapsed: { ...state.collapsed, [key]: !state.collapsed[key] },
    });
}

export function toggleHudAll() {
    load();

    commit({ ...state, all: !state.all });
}

export function getHudVisibility(): HudVisibility {
    load();

    return state;
}

const subscribe = (cb: () => void) => {
    listeners.add(cb);

    return () => {
        listeners.delete(cb);
    };
};

const useHudState = () =>
    useSyncExternalStore(subscribe, getHudVisibility, () => EMPTY);

export function useHudBlock(key: HudBlockKey, ignoreAll = false) {
    const s = useHudState();

    const collapsed = !!s.collapsed[key];

    const allHidden = s.all && !ignoreAll;

    const toggle = useCallback(() => toggleHudBlock(key), [key]);

    return { collapsed, hidden: collapsed || allHidden, allHidden, toggle };
}

export const useHudAllHidden = () => useHudState().all;

const isTyping = (t: EventTarget | null) =>
    t instanceof HTMLElement &&
    (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

export function useHudHotkey() {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.code !== 'KeyH' || e.repeat) return;

            if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented)
                return;

            if (isTyping(e.target)) return;

            if (
                e.target instanceof Element &&
                e.target.closest('[role="dialog"],[role="alertdialog"]')
            )
                return;

            toggleHudAll();
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, []);
}
