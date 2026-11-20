import { WORLD_MINOR_PIN_ZOOM } from '@/lib/constants/world';
import type { WorldMarker } from '@/types/world';

const MINOR_ICONS = new Set(['village', 'camp']);

type PinLike = Pick<WorldMarker, 'kind' | 'icon'>;

export const isMinorPin = (m: PinLike) =>
    m.kind !== 'zone' && !!m.icon && MINOR_ICONS.has(m.icon);

/** Minor pins (villages, camps) appear only once zoomed in, unless they are selected or being dragged. */
export const pinHiddenAtZoom = (m: PinLike, zoom: number, pinned: boolean) =>
    !pinned && isMinorPin(m) && zoom < WORLD_MINOR_PIN_ZOOM;

const PIN_RANK: Record<string, number> = {
    castle: 0,
    city: 1,
    portal: 2,
    dungeon: 3,
    landmark: 4,
    battle: 5,
    village: 7,
    camp: 8,
};

const NO_ICON_RANK = 6;

/** Lower ranks win as a cluster representative; minor pins always rank below the rest. */
export const pinRank = (m: PinLike) =>
    m.icon ? (PIN_RANK[m.icon] ?? NO_ICON_RANK) : NO_ICON_RANK;

export const byPinRank = (a: PinLike, b: PinLike) => pinRank(a) - pinRank(b);
