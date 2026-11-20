import { WORLD_ZONE_LABEL_HIDE_ZOOM } from '@/lib/constants/world';
import { polygonArea } from '@/lib/utils/world/geometry';
import type { Polygon, ZoneLabelMode } from '@/types/world';

const MIN_SIZE = 11;

const MAX_SIZE = 22;

const SIZE_BASE = 10;

const SIZE_PER_EXTENT = 40;

/** On-screen font size in px: grows with the zone's apparent extent (area and zoom). */
export const zoneLabelSize = (polygon: Polygon, zoom: number) =>
    Math.round(
        Math.min(
            MAX_SIZE,
            Math.max(
                MIN_SIZE,
                SIZE_BASE + Math.sqrt(polygonArea(polygon)) * zoom * SIZE_PER_EXTENT
            )
        )
    );

export interface ZoneLabelInput {
    zoom: number;
    known: boolean;
    fogless: boolean;
    clashes: boolean;
    overlaps: boolean;
    hovered: boolean;
    labelMode?: ZoneLabelMode;
}

/** `hidden`/`always` override everything; otherwise known or fogless zones always label; others hide when zoomed in, clashing or overlapping, unless hovered. */
export function zoneLabelVisible({
    zoom,
    known,
    fogless,
    clashes,
    overlaps,
    hovered,
    labelMode = 'auto',
}: ZoneLabelInput): boolean {
    if (labelMode === 'hidden') return false;

    if (labelMode === 'always') return true;

    if (hovered) return true;

    if (clashes || overlaps) return false;

    return known || fogless || zoom <= WORLD_ZONE_LABEL_HIDE_ZOOM;
}
