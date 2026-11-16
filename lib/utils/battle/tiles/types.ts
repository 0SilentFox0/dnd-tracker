export const TILE_LAYERS = [
    'ground',
    'wallfill',
    'objects',
    'edge-art',
    'effects',
] as const;

export type TileLayer = (typeof TILE_LAYERS)[number];

export function isTileLayer(layer: string): layer is TileLayer {
    return (TILE_LAYERS as readonly string[]).includes(layer);
}
