import { DEFAULT_BATTLE_MAP } from '@/lib/constants/battle';
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
