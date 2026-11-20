'use client';

import { useMemo, useState } from 'react';

import { useLayerVisibility } from './useLayerVisibility';
import { useWorldView } from './useWorldView';

import type { WorldViewLayer } from '@/types/world';

const NO_LAYERS: WorldViewLayer[] = [];

export function useHeroEyes(campaignId: string, mapId: string | null) {
    const [asHeroId, setAsHeroId] = useState<string | null>(null);

    const view = useWorldView(campaignId, {
        mapId: asHeroId ? mapId : null,
        asHeroId: asHeroId ?? undefined,
    });

    const items = view.data?.layers ?? NO_LAYERS;

    const ids = useMemo(() => items.map((l) => l.id), [items]);

    const { hidden, toggle } = useLayerVisibility(ids);

    return {
        asHeroId,
        setAsHeroId,
        view,
        layers: { items, hidden, toggle },
    };
}
