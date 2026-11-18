import type { TileLayer } from '@/lib/utils/battle/tiles/types';
import type { BattleMapConfig } from '@/types/battle-grid';

export interface BattleMapBrief {
    id: string;
    name: string;
    cols: number;
    rows: number;
    version: number;
    updatedAt: string;
}

export interface BattleMapFull extends BattleMapBrief {
    map: Omit<BattleMapConfig, 'walls' | 'bars'>;
    walls: string[];
    bars: string[];
}

export interface BattleMapTileChunks {
    version: number;
    chunks: Partial<Record<TileLayer, Record<string, string>>>;
}
