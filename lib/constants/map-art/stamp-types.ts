export type StampBiome = 'dungeon' | 'building' | 'nature' | 'settlement';

export type StampLayer = 'decal' | 'object' | 'canopy';

export interface StampBlocks {
    shape: 'rect' | 'ellipse';
    w: number;
    h: number;
}

export interface StampDef {
    id: string;
    biome: StampBiome;
    category: string;
    nameKey: string;
    file: string;
    cols: number;
    rows: number;
    layer: StampLayer;
    shadow: 'none' | 'soft' | 'hard';
    blocks?: StampBlocks;
    sight?: true;
    priority: 1 | 2;
}
