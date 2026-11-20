'use client';

import { useCallback, useMemo, useState } from 'react';

import { NO_LAYER_KEY } from '@/lib/constants/world';

export function useLayerVisibility(layerIds: string[]) {
    const [off, setOff] = useState<ReadonlySet<string>>(new Set());

    const key = layerIds.join('\0');

    // drop ids of layers that no longer exist
    const hidden = useMemo(() => {
        const alive = new Set(key ? key.split('\0') : []);

        alive.add(NO_LAYER_KEY);

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
        (layerId: string | null) => !hidden.has(layerId ?? NO_LAYER_KEY),
        [hidden]
    );

    return { hidden, toggle, isShown };
}
