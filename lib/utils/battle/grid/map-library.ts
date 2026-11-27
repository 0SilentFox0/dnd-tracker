import {
    DEFAULT_BATTLE_MAP,
    DEFAULT_MAP_BACKGROUND,
} from '@/lib/constants/battle';
import type { BattleMapInput } from '@/lib/schemas/battle-maps';
import type { BattleMapConfig } from '@/types/battle-grid';

/** Battle map to library payload: walls and bars move out of the header. */
export function battleMapToLibraryInput(
    map: BattleMapConfig,
    name: string
): BattleMapInput {
    const { walls = [], bars = [], ...header } = map;

    return {
        name: name.trim(),
        map: header as BattleMapInput['map'],
        walls,
        bars,
    };
}

/** True for the untouched default map: nothing drawn, no image, no mode. */
export function isFreshMap(map: BattleMapConfig): boolean {
    return (
        map.cols === DEFAULT_BATTLE_MAP.cols &&
        map.rows === DEFAULT_BATTLE_MAP.rows &&
        !map.background &&
        !map.walls?.length &&
        !map.bars?.length &&
        !map.blocked?.length &&
        !Object.keys(map.terrain ?? {}).length &&
        !Object.keys(map.doors ?? {}).length &&
        !map.maze
    );
}

export function withPlainGrid(map: BattleMapConfig): BattleMapConfig {
    return { ...map, background: null, plainGrid: true };
}

/** A null background means the default image, unless the map is an explicit plain grid. */
export function showsBackground(
    map: Pick<BattleMapConfig, 'background' | 'plainGrid'>,
    showDefault: boolean
): boolean {
    return !!map.background || (showDefault && !map.plainGrid);
}

export function backgroundForSave(
    map: Pick<BattleMapConfig, 'background' | 'plainGrid'>
): string | null {
    if (map.background) return map.background;

    return map.plainGrid ? null : DEFAULT_MAP_BACKGROUND;
}
