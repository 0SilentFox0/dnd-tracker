import { WORLD_MINOR_PIN_ZOOM } from '@/lib/constants/world';
import type { WorldMarker } from '@/types/world';

const MINOR_ICONS = new Set(['village', 'camp']);

type PinLike = Pick<WorldMarker, 'kind' | 'icon'>;

export const isMinorPin = (m: PinLike) =>
    m.kind !== 'zone' && !!m.icon && MINOR_ICONS.has(m.icon);

/** Minor pins (villages, camps) appear only once zoomed in, unless they are selected or being dragged. */
export const pinHiddenAtZoom = (m: PinLike, zoom: number, pinned: boolean) =>
    !pinned && isMinorPin(m) && zoom < WORLD_MINOR_PIN_ZOOM;
