'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { useWorldView } from './useWorldView';

import { markerAnchor } from '@/lib/utils/world/geometry';
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

    const hasSelection = selectedId !== null;

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (
                e.key !== 'Escape' ||
                e.defaultPrevented ||
                (!detailsOpen && !hasSelection) ||
                (e.target instanceof HTMLElement &&
                    (e.target.isContentEditable ||
                        ['INPUT', 'TEXTAREA', 'SELECT'].includes(
                            e.target.tagName
                        ))) ||
                (e.target instanceof Element &&
                    e.target.closest('[role=dialog]'))
            )
                return;

            if (detailsOpen) setDetailsOpen(false);
            else select(null);

            e.preventDefault();
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [detailsOpen, hasSelection]);

    const pickPlace = useCallback(
        (id: string) => {
            const m = view.data?.markers.find((x) => x.id === id);

            if (!m) return;

            selectMarker(id);
            focusPoint(markerAnchor(m));
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

    const selectedMarker =
        view.data?.markers.find((m) => m.id === selectedId) ?? null;

    const visibleChild = (m: { childMapId: string | null }) =>
        m.childMapId && view.data?.maps.some((x) => x.id === m.childMapId)
            ? m.childMapId
            : null;

    const openChild = (id: string) => {
        const m = view.data?.markers.find((x) => x.id === id);

        const child = m && visibleChild(m);

        if (child) openMap(child);
    };

    return {
        view,
        selectedMarker,
        card: {
            point: selectedMarker ? markerAnchor(selectedMarker) : null,
            canOpenChild: !!selectedMarker && !!visibleChild(selectedMarker),
        },
        openChild,
        handlers: {
            onMarkerClick: selectMarker,
            onMarkerDoubleClick: openChild,
            onMapClick: () => selectMarker(null),
        },
        select: selectMarker,
        pickPlace,
        details: { open: detailsOpen, set: setDetailsOpen },
        tree: { open: treeOpen, set: setTreeOpen },
        focus,
        focusHero,
        openMap,
        myHeroes: view.data?.heroes.filter((h) => h.own) ?? [],
    };
}
