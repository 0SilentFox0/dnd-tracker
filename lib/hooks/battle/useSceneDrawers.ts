'use client';

import { useState } from 'react';

export type SceneDrawerKey = 'log' | 'dm' | 'reserve' | 'tools';

type LogHandle = { open: boolean; show: () => void; close: () => void };

export function useSceneDrawers(log: LogHandle) {
    const [drawer, setDrawer] = useState<Exclude<SceneDrawerKey, 'log'> | null>(
        null
    );

    const [seenLogOpen, setSeenLogOpen] = useState(log.open);

    if (log.open !== seenLogOpen) {
        setSeenLogOpen(log.open);

        if (log.open) setDrawer(null);
    }

    const active: SceneDrawerKey | null = log.open ? 'log' : drawer;

    const toggle = (key: SceneDrawerKey) => {
        if (key === 'log') {
            setDrawer(null);

            if (log.open) log.close();
            else log.show();

            return;
        }

        if (log.open) log.close();

        setDrawer((prev) => (prev === key ? null : key));
    };

    const onOpenChange =
        (key: Exclude<SceneDrawerKey, 'log'>) => (open: boolean) =>
            setDrawer((prev) => (open ? key : prev === key ? null : prev));

    return { drawer, active, toggle, onOpenChange };
}
