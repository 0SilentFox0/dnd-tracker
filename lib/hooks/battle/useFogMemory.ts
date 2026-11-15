'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { decodeFogMemory, encodeFogMemory } from '@/lib/utils/battle/fog/memory';
import { normalizeRevealedRuns } from '@/lib/utils/battle/fog/revealed-runs';

const keyOf = (battleId: string, viewerId: string) =>
    `dnd-tracker:fog:v1:${battleId}:${viewerId}`;

const getServerSnapshot = () => null;

export function useFogMemory({
    battleId,
    viewerId,
    size,
    visible,
    enabled = true,
}: {
    battleId: string;
    viewerId: string;
    size: { cols: number; rows: number };
    visible: ReadonlySet<string>;
    enabled?: boolean;
}) {
    const { cols, rows } = size;

    const [remember, setRemember] = useState(true);

    const storageKey = keyOf(battleId, viewerId);

    const getSnapshot = useCallback(() => {
        try {
            return window.localStorage.getItem(storageKey);
        } catch {
            return null;
        }
    }, [storageKey]);

    const subscribe = useCallback(
        (notify: () => void) => {
            const onStorage = (event: StorageEvent) => {
                if (event.key === storageKey) notify();
            };

            const onLocalChange = () => notify();

            window.addEventListener('storage', onStorage);
            window.addEventListener('fog-memory-change', onLocalChange);

            return () => {
                window.removeEventListener('storage', onStorage);
                window.removeEventListener('fog-memory-change', onLocalChange);
            };
        },
        [storageKey]
    );

    const rawMemory = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot
    );

    const storedRuns = useMemo(
        () => decodeFogMemory(rawMemory, { cols, rows }),
        [rawMemory, cols, rows]
    );

    const visibleRuns = useMemo(
        () =>
            normalizeRevealedRuns(
                [...visible].map((cell) => {
                    const [x, y] = cell.split(':').map(Number);

                    return [y, x, x + 1] as const;
                }),
                { cols, rows }
            ),
        [visible, cols, rows]
    );

    const exploredRuns = useMemo(
        () =>
            remember
                ? normalizeRevealedRuns([...storedRuns, ...visibleRuns], {
                      cols,
                      rows,
                  })
                : [],
        [remember, storedRuns, visibleRuns, cols, rows]
    );

    useEffect(() => {
        if (!enabled) return;

        try {
            if (remember)
                window.localStorage.setItem(
                    storageKey,
                    encodeFogMemory(exploredRuns, { cols, rows })
                );
            else window.localStorage.removeItem(storageKey);

            window.dispatchEvent(new Event('fog-memory-change'));
        } catch {
            // Private browsing or storage quota: in-memory exploration still works.
        }
    }, [enabled, remember, storageKey, exploredRuns, cols, rows]);

    const explored = useMemo(() => {
        const cells = new Set<string>();

        for (const [y, start, end] of exploredRuns)
            for (let x = start; x < end; x++) cells.add(`${x}:${y}`);

        return cells;
    }, [exploredRuns]);

    return { explored, remember, setRemember };
}
