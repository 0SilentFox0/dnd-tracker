import { MAP_LIMITS } from '@/lib/constants/map-limits';

export function battleMapMaxSide(flags: {
    mapLibraryEnabled?: boolean | null;
}): number {
    return flags.mapLibraryEnabled
        ? MAP_LIMITS.tileMaxSide
        : MAP_LIMITS.battleMaxSide;
}
