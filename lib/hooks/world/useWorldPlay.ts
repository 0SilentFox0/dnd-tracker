'use client';

import { useCallback, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { useWorldView } from './useWorldView';

import { polygonCentroid } from '@/lib/utils/world/geometry';
import type { MapPoint, WorldHero } from '@/types/world';

export function useWorldPlay(campaignId: string, mapId: string | null) {
    const router = useRouter();

    const pathname = usePathname();

    const view = useWorldView(campaignId, { mapId });

    const [selectedId, select] = useState<string | null>(null);

    const [focus, setFocus] = useState<
        { point: MapPoint; seq: number } | undefined
    >();

    const focusPoint = useCallback(
        (point: MapPoint) =>
            setFocus((f) => ({ point, seq: (f?.seq ?? 0) + 1 })),
        []
    );

    const focusHero = useCallback(
        (hero: WorldHero) => focusPoint({ x: hero.x, y: hero.y }),
        [focusPoint]
    );

    const [detailsOpen, setDetailsOpen] = useState(false);

    const [treeOpen, setTreeOpen] = useState(false);

    const selectMarker = useCallback((id: string | null) => {
        select(id);
        setDetailsOpen(false);
    }, []);

    const pickPlace = useCallback(
        (id: string) => {
            const m = view.data?.markers.find((x) => x.id === id);

            if (!m) return;

            selectMarker(id);
            focusPoint(
                m.kind === 'zone' && m.polygon
                    ? polygonCentroid(m.polygon)
                    : { x: m.x, y: m.y }
            );
        },
        [view.data, selectMarker, focusPoint]
    );

    const openMap = useCallback(
        (id: string) => {
            selectMarker(null);
            setTreeOpen(false);
            router.push(`${pathname}?map=${id}`);
        },
        [router, pathname, selectMarker]
    );

    return {
        view,
        selectedMarker:
            view.data?.markers.find((m) => m.id === selectedId) ?? null,
        select: selectMarker,
        pickPlace,
        details: { open: detailsOpen, set: setDetailsOpen },
        tree: { open: treeOpen, set: setTreeOpen },
        focus,
        focusPoint,
        focusHero,
        openMap,
        myHeroes: view.data?.heroes.filter((h) => h.own) ?? [],
    };
}
