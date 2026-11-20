'use client';

import { useCallback, useMemo, useState } from 'react';

export function useLayerVisibility(layerIds: string[]) {
    const [off, setOff] = useState<ReadonlySet<string>>(new Set());

    const key = layerIds.join('\0');

    // drop ids of layers that no longer exist
    const hidden = useMemo(() => {
        const alive = new Set(key ? key.split('\0') : []);

        return new Set([...off].filter((id) => alive.has(id)));
    }, [off, key]);

    const toggle = useCallback(
        (id: string) =>
            setOff((prev) => {
                const next = new Set(prev);

                if (!next.delete(id)) next.add(id);

                return next;
            }),
        []
    );

    const isShown = useCallback(
        (layerId: string | null) => layerId === null || !hidden.has(layerId),
        [hidden]
    );

    return { hidden, toggle, isShown };
}
