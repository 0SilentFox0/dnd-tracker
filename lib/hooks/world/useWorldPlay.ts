'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { useLayerVisibility } from './useLayerVisibility';
import { useMapFocus } from './useMapFocus';
import { useMapFullscreen } from './useMapFullscreen';
import { useWorldView } from './useWorldView';

import { DESKTOP_QUERY, useMediaQuery } from '@/lib/hooks/common';
import { escapeStep } from '@/lib/utils/world/escape-step';
import { markerAnchor } from '@/lib/utils/world/geometry';
import { isTyping } from '@/lib/utils/world/is-typing';
import type { WorldHero, WorldViewLayer } from '@/types/world';

const NO_LAYERS: WorldViewLayer[] = [];

export function useWorldPlay(campaignId: string, mapId: string | null) {
    const router = useRouter();

    const pathname = usePathname();

    const view = useWorldView(campaignId, { mapId });

    const layerItems = view.data?.layers ?? NO_LAYERS;

    const layerIds = useMemo(() => layerItems.map((l) => l.id), [layerItems]);

    const { hidden, toggle } = useLayerVisibility(layerIds);

    const [selectedId, select] = useState<string | null>(null);

    const { focus, focusPoint } = useMapFocus();

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

    const fullscreen = useMapFullscreen();

    const { full, exit } = fullscreen;

    const desktop = useMediaQuery(DESKTOP_QUERY);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (
                e.key !== 'Escape' ||
                e.defaultPrevented ||
                isTyping(e.target) ||
                (e.target instanceof Element &&
                    e.target.closest('[role=dialog]'))
            )
                return;

            const step = escapeStep({
                details: detailsOpen,
                full,
                selection: hasSelection,
            });

            if (step === null) return;

            if (step === 'details') setDetailsOpen(false);
            else if (step === 'fullscreen') exit();
            else select(null);

            e.preventDefault();
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [detailsOpen, hasSelection, full, exit]);

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

    const openDetails = () => {
        if (!selectedMarker) return;

        if (desktop) {
            exit();
            focusPoint(markerAnchor(selectedMarker), 1);
        }

        setDetailsOpen(true);
    };

    const openChild = (id: string) => {
        const m = view.data?.markers.find((x) => x.id === id);

        const child = m && visibleChild(m);

        if (child) openMap(child);
    };

    return {
        view,
        layers: { items: layerItems, hidden, toggle },
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
        openDetails,
        fullscreen,
        tree: { open: treeOpen, set: setTreeOpen },
        focus,
        focusHero,
        openMap,
        myHeroes: view.data?.heroes.filter((h) => h.own) ?? [],
    };
}
