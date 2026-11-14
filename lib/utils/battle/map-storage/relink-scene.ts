import { MAP_LIMITS } from '@/lib/constants/map-limits';
import type { LibraryEdges } from '@/lib/utils/battle/map-storage/effective-map';
import type { BattleMapConfig } from '@/types/battle';

/** Another library map replaces the geometry; only the battle's own atmosphere carries over. */
export function headerForOtherMap(
    current: BattleMapConfig | null,
    library: BattleMapConfig
): BattleMapConfig {
    const out: BattleMapConfig = { ...library };

    if (current?.weather) out.weather = current.weather;

    if (current?.motion) out.motion = current.motion;

    return out;
}

/** Linked -> own map: the pinned version's edges become inline; null when they exceed the inline limit. */
export function materializeEdges(
    current: BattleMapConfig,
    edges: LibraryEdges
): BattleMapConfig | null {
    if (edges.walls.length + edges.bars.length > MAP_LIMITS.inlineMaxEdges)
        return null;

    const out: BattleMapConfig = { ...current };

    if (edges.walls.length > 0) out.walls = [...edges.walls];

    if (edges.bars.length > 0) out.bars = [...edges.bars];

    return out;
}
