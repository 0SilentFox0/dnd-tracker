import type { BattleMapConfig } from '@/types/battle';

export interface BattleMapBrief {
    id: string;
    name: string;
    cols: number;
    rows: number;
    version: number;
    updatedAt: string;
}

/** map — шапка без walls/bars; ребра окремо, вони живуть у чанках */
export interface BattleMapFull extends BattleMapBrief {
    map: Omit<BattleMapConfig, 'walls' | 'bars'>;
    walls: string[];
    bars: string[];
}
