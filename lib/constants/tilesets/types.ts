import type { TileLayer } from '@/lib/utils/battle/tiles/types';

export interface TileDefinition {
    id: number;
    key: string;
    nameKey: string;
    layer: TileLayer;
    assetFile: string;
    source: 'cc0' | 'generated' | 'campaign';
    license: string;
    attribution?: string;
    footprint: { cols: number; rows: number };
    autotile: 'ground-16' | 'none';
    blocks: boolean;
    blocksSight: boolean;
}
