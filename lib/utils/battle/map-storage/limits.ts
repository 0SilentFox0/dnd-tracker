import { MAP_LIMITS } from '@/lib/constants/map-limits';

export function battleMapMaxSide(flags: {
    mapLibraryEnabled?: boolean | null;
}): number {
    return flags.mapLibraryEnabled
        ? MAP_LIMITS.tileMaxSide
        : MAP_LIMITS.battleMaxSide;
}

export function maxEdgesFor(map: { cols: number; rows: number }): number {
    return Math.max(map.cols, map.rows) > MAP_LIMITS.photoMaxSide
        ? MAP_LIMITS.libraryMaxEdges
        : MAP_LIMITS.inlineMaxEdges;
}
